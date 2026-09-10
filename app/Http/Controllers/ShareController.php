<?php

namespace App\Http\Controllers;

use App\Enums\ShareMessageType;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Services\Analytics;
use App\Support\PatunganShareService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Composes the messages an organizer sends, and records that they asked.
 *
 * Nothing here sends anything. Every endpoint returns text for the organizer to
 * paste, which is the whole design: the moment an application can message a
 * WhatsApp group by itself, it is one bug away from being a spam machine.
 *
 * Personal reminders live here rather than in the page payload because issuing
 * a participant's token is a side effect. Tokens are minted when somebody is
 * actually chased, so a participant nobody ever chases has no credential that
 * could leak.
 */
class ShareController extends Controller
{
    public function __construct(
        private readonly PatunganShareService $share,
        private readonly Analytics $analytics,
    ) {}

    /**
     * A personal payment link and the message that carries it.
     *
     * Authorised against the patungan, and the participant is resolved through
     * that patungan's own relation - so an organizer cannot mint a token for
     * somebody else's participant by pairing two unrelated ids.
     */
    public function personalReminder(Request $request, Patungan $patungan, PatunganParticipant $participant): JsonResponse
    {
        $this->authorize('manageParticipants', $patungan);
        abort_unless($participant->patungan_id === $patungan->id, 404);

        $message = $this->share->personalReminder($patungan, $participant);

        $this->analytics->record(
            Analytics::PERSONAL_REMINDER_CLICKED,
            ['participant' => $participant->uuid],
            userId: $request->user()->id,
            patunganId: $patungan->id,
        );

        return response()->json([
            'type' => ShareMessageType::PersonalReminder->value,
            'message' => $message,
            'url' => $this->share->personalUrl($patungan, $participant),
            'participant' => $participant->name,
        ]);
    }

    /**
     * Records that a share actually happened.
     *
     * Separate from composing the message because those are different facts:
     * one says the organizer looked, the other says they sent. Only the second
     * tells us whether the WhatsApp-first flow is really being used.
     */
    public function record(Request $request, Patungan $patungan): JsonResponse
    {
        $this->authorize('view', $patungan);

        $validated = $request->validate([
            'type' => ['required', 'string'],
            'channel' => ['nullable', 'string', 'max:20'],
        ]);

        $type = ShareMessageType::tryFrom($validated['type']);

        if ($type === null) {
            return response()->json(['recorded' => false], 422);
        }

        $channel = $validated['channel'] ?? 'whatsapp';

        $this->analytics->record(
            $channel === 'clipboard'
                ? Analytics::SHARE_LINK_COPIED
                : match ($type) {
                    ShareMessageType::UnpaidReminder => Analytics::REMINDER_CLICKED,
                    ShareMessageType::Progress => Analytics::PROGRESS_SHARED,
                    ShareMessageType::PersonalReminder => Analytics::PERSONAL_REMINDER_CLICKED,
                    default => Analytics::WHATSAPP_SHARE_CLICKED,
                },
            // Never the message body: it carries names and amounts, and this
            // table exists to count behaviour, not to archive people's bills.
            ['message_type' => $type->value, 'channel' => $channel],
            userId: $request->user()->id,
            patunganId: $patungan->id,
        );

        return response()->json(['recorded' => true]);
    }
}
