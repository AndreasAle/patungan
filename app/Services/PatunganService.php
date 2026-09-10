<?php

namespace App\Services;

use App\Enums\ParticipantStatus;
use App\Enums\PatunganCategory;
use App\Enums\PatunganPrivacy;
use App\Enums\PatunganStatus;
use App\Enums\SplitType;
use App\Events\PatunganCompleted;
use App\Events\PatunganCreated;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PatunganService
{
    public function __construct(
        private readonly Analytics $analytics,
        private readonly RoomPinService $pins,
    ) {}

    /**
     * @param  array{title: string, description?: ?string, category: string, split_type: string, equal_amount?: ?int, event_date?: ?string, expires_at?: ?string, name_privacy?: ?string, privacy_mode?: ?string, participants: array<int, array{name: string, amount?: ?int, note?: ?string}>}  $data
     */
    /**
     * Starts a fresh patungan from a finished one.
     *
     * This is the retention feature: the same futsal group splits the same
     * court fee every week, and re-typing eight names every time is what makes
     * people stop bothering.
     *
     * What carries over is only what describes the arrangement - title,
     * category, split, who is in the group and what each of them owes. What
     * does not carry over is everything that records money having moved:
     * payments, paid flags, ledger entries, settlements, invoice numbers,
     * gateway references, timestamps. A copied paid flag would show an
     * organizer money they never received, which is the single worst thing this
     * feature could do, so the new participants are built from names and
     * amounts alone rather than by cloning rows.
     *
     * A brand new public token is issued as well. Reusing the old one would
     * mean last week's WhatsApp message silently starts collecting for this
     * week's patungan.
     */
    public function repeat(Patungan $original, ?string $title = null): Patungan
    {
        $original->loadMissing('participants');

        return $this->create($original->organizer, [
            'title' => $title ?: $original->title,
            'description' => $original->description,
            'category' => $original->category->value,
            'split_type' => $original->split_type->value,
            'equal_amount' => $original->equal_amount,
            'name_privacy' => $original->name_privacy->value,
            'privacy_mode' => $original->privacy_mode->value,
            /*
             * Deliberately not copied: event_date and expires_at. A repeat is a
             * new occasion, and inheriting last week's deadline would produce a
             * patungan that has already expired the moment it is created.
             */
            'participants' => $original->participants
                ->map(fn (PatunganParticipant $participant): array => [
                    'name' => $participant->name,
                    'note' => $participant->note,
                    'amount' => (int) $participant->amount_due,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function create(User $organizer, array $data): Patungan
    {
        $splitType = SplitType::from($data['split_type']);
        $equalAmount = $splitType === SplitType::Equal ? (int) $data['equal_amount'] : null;

        $patungan = DB::transaction(function () use ($organizer, $data, $splitType, $equalAmount): Patungan {
            $patungan = new Patungan([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'category' => PatunganCategory::from($data['category']),
                'split_type' => $splitType,
                'equal_amount' => $equalAmount,
                'event_date' => $data['event_date'] ?? null,
                'expires_at' => $data['expires_at'] ?? null,
            ]);

            $patungan->organizer_id = $organizer->id;
            $patungan->status = PatunganStatus::Active;
            $patungan->public_token = Patungan::generatePublicToken();
            $patungan->slug = Str::slug($data['title']) ?: null;
            $patungan->name_privacy = $data['name_privacy'] ?? 'FULL';
            $patungan->privacy_mode = PatunganPrivacy::from($data['privacy_mode'] ?? PatunganPrivacy::Open->value);
            $patungan->currency = config('patungan.currency');
            $patungan->save();

            foreach (array_values($data['participants']) as $index => $participant) {
                $amountDue = $splitType === SplitType::Equal
                    ? $equalAmount
                    : (int) $participant['amount'];

                $row = $patungan->participants()->make([
                    'name' => $participant['name'],
                    'note' => $participant['note'] ?? null,
                    'amount_due' => $amountDue,
                    'position' => $index,
                ]);

                if ($patungan->isPrivateRoom()) {
                    $this->pins->assign($row, $patungan);
                }

                $patungan->participants()->save($row);
            }

            $this->refreshAggregates($patungan);

            return $patungan;
        });

        PatunganCreated::dispatch($patungan);
        $this->analytics->record(
            Analytics::PATUNGAN_CREATED,
            ['participants' => $patungan->participant_count, 'split_type' => $splitType->value],
            userId: $organizer->id,
            patunganId: $patungan->id,
        );

        return $patungan;
    }

    /**
     * Recomputes the cached aggregates from the participant rows, which are the
     * source of truth. Always called inside the transaction that changed them.
     */
    public function refreshAggregates(Patungan $patungan): Patungan
    {
        $totals = PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->selectRaw('COUNT(*) as participants')
            ->selectRaw('COALESCE(SUM(amount_due), 0) as target')
            ->selectRaw('COALESCE(SUM(amount_paid), 0) as collected')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as paid_count', [ParticipantStatus::Paid->value])
            ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN 0 ELSE 1 END) as outstanding', [
                ParticipantStatus::Paid->value,
                ParticipantStatus::Waived->value,
            ])
            ->first();

        $patungan->participant_count = (int) $totals->participants;
        $patungan->target_amount = (int) $totals->target;
        $patungan->collected_amount = (int) $totals->collected;
        $patungan->paid_participant_count = (int) $totals->paid_count;

        $wasCompleted = $patungan->status === PatunganStatus::Completed;
        $everyoneSettled = (int) $totals->participants > 0 && (int) $totals->outstanding === 0;

        if ($everyoneSettled && $patungan->status === PatunganStatus::Active) {
            $patungan->status = PatunganStatus::Completed;
            $patungan->completed_at = now();
        } elseif (! $everyoneSettled && $patungan->status === PatunganStatus::Completed) {
            // A new participant was added after completion - reopen it.
            $patungan->status = PatunganStatus::Active;
            $patungan->completed_at = null;
        }

        $patungan->save();

        if (! $wasCompleted && $patungan->status === PatunganStatus::Completed) {
            DB::afterCommit(function () use ($patungan): void {
                PatunganCompleted::dispatch($patungan);
                $this->analytics->record(
                    Analytics::PATUNGAN_COMPLETED,
                    ['collected' => $patungan->collected_amount],
                    userId: $patungan->organizer_id,
                    patunganId: $patungan->id,
                );
            });
        }

        return $patungan;
    }

    /** @param  array<string, mixed>  $data */
    public function update(Patungan $patungan, array $data): Patungan
    {
        return DB::transaction(function () use ($patungan, $data): Patungan {
            $patungan->fill(array_filter([
                'title' => $data['title'] ?? null,
                'category' => $data['category'] ?? null,
                'event_date' => $data['event_date'] ?? null,
            ], fn ($value) => $value !== null));

            // Nullable fields have to be assigned explicitly.
            if (array_key_exists('description', $data)) {
                $patungan->description = $data['description'];
            }

            // Nullable so an organizer can lift the deadline again.
            if (array_key_exists('expires_at', $data)) {
                $patungan->expires_at = $data['expires_at'];
            }

            if (array_key_exists('name_privacy', $data) && $data['name_privacy'] !== null) {
                $patungan->name_privacy = $data['name_privacy'];
            }

            $patungan->save();

            return $this->refreshAggregates($patungan);
        });
    }

    public function close(Patungan $patungan): Patungan
    {
        return DB::transaction(function () use ($patungan): Patungan {
            $patungan->status = PatunganStatus::Closed;
            $patungan->closed_at = now();
            $patungan->save();

            return $patungan;
        });
    }

    public function reopen(Patungan $patungan): Patungan
    {
        return DB::transaction(function () use ($patungan): Patungan {
            $patungan->status = PatunganStatus::Active;
            $patungan->closed_at = null;
            $patungan->save();

            return $this->refreshAggregates($patungan);
        });
    }
}
