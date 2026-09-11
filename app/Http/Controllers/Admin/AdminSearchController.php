<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Models\Payment;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * One box that searches everything an operator arrives holding.
 *
 * Support gets handed exactly one identifier - an email, a payment reference, a
 * patungan title, a bank reference - and previously had to guess which of five
 * admin pages it belonged to before they could look it up. This searches all of
 * them at once and says which is which.
 *
 * Returns JSON rather than an Inertia page: this is a lookup on the way to
 * somewhere, not a destination, and a full page visit per keystroke would be
 * both slower and a worse place to land.
 */
class AdminSearchController extends Controller
{
    /** Enough to be a real identifier. One character would scan every table. */
    private const MIN_LENGTH = 2;

    private const PER_GROUP = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());

        if (mb_strlen($term) < self::MIN_LENGTH) {
            return response()->json(['query' => $term, 'groups' => []]);
        }

        $like = '%'.$term.'%';

        $groups = array_values(array_filter([
            $this->group('Pengguna', $this->users($like)),
            $this->group('Patungan', $this->patungans($like)),
            $this->group('Pembayaran', $this->payments($like)),
            $this->group('Pencairan', $this->settlements($like)),
        ]));

        return response()->json(['query' => $term, 'groups' => $groups]);
    }

    /** @param list<array<string, string|null>> $items */
    private function group(string $label, array $items): ?array
    {
        // An empty heading is noise. Groups with nothing in them are dropped
        // rather than rendered as "Pencairan (0)".
        return $items === [] ? null : ['label' => $label, 'items' => $items];
    }

    /** @return list<array<string, string|null>> */
    private function users(string $like): array
    {
        return User::query()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (User $user) => [
                'title' => $user->name,
                'subtitle' => $user->email,
                // Landing on the list pre-filtered, because there is no
                // single-user page to land on.
                'href' => route('admin.users', ['search' => $user->email]),
            ])
            ->all();
    }

    /** @return list<array<string, string|null>> */
    private function patungans(string $like): array
    {
        return Patungan::query()
            ->with('organizer:id,name')
            ->where(fn ($q) => $q->where('title', 'like', $like)->orWhere('uuid', 'like', $like))
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (Patungan $patungan) => [
                'title' => $patungan->title,
                'subtitle' => $patungan->organizer?->name.' · '.$patungan->status->label(),
                'href' => route('admin.patungans', ['search' => $patungan->title]),
            ])
            ->all();
    }

    /** @return list<array<string, string|null>> */
    private function payments(string $like): array
    {
        return Payment::query()
            ->with('participant:id,name')
            ->where(fn ($q) => $q->where('gateway_reference', 'like', $like)
                ->orWhere('gateway_transaction_id', 'like', $like)
                ->orWhere('external_id', 'like', $like)
                ->orWhere('uuid', 'like', $like))
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (Payment $payment) => [
                'title' => $payment->gateway_reference,
                'subtitle' => ($payment->participant?->name ?? '-').' · '.$payment->status->label(),
                'href' => route('admin.payments', ['search' => $payment->gateway_reference]),
            ])
            ->all();
    }

    /** @return list<array<string, string|null>> */
    private function settlements(string $like): array
    {
        return Settlement::query()
            ->with('organizer:id,name')
            ->where(fn ($q) => $q->where('provider_reference', 'like', $like)
                ->orWhere('uuid', 'like', $like)
                ->orWhere('destination_holder_name', 'like', $like))
            ->limit(self::PER_GROUP)
            ->get()
            ->map(fn (Settlement $settlement) => [
                'title' => $settlement->provider_reference ?: $settlement->uuid,
                'subtitle' => $settlement->organizer?->name.' · '.$settlement->status->label(),
                'href' => route('admin.settlements', ['status' => $settlement->status->value]),
            ])
            ->all();
    }
}
