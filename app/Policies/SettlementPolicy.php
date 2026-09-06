<?php

namespace App\Policies;

use App\Models\Settlement;
use App\Models\User;

class SettlementPolicy
{
    public function view(User $user, Settlement $settlement): bool
    {
        return $user->id === $settlement->organizer_id || $user->isAdmin();
    }

    /** Only the organizer who owns the balance may withdraw it. */
    public function create(User $user): bool
    {
        return ! $user->isSuspended();
    }

    public function process(User $user, Settlement $settlement): bool
    {
        return $user->isAdmin();
    }
}
