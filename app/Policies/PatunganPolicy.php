<?php

namespace App\Policies;

use App\Models\Patungan;
use App\Models\User;

class PatunganPolicy
{
    /** Admins get read-only oversight through the admin panel, never write access here. */
    public function view(User $user, Patungan $patungan): bool
    {
        return $this->owns($user, $patungan) || $user->isAdmin();
    }

    public function update(User $user, Patungan $patungan): bool
    {
        return $this->owns($user, $patungan) && ! $user->isSuspended();
    }

    public function manageParticipants(User $user, Patungan $patungan): bool
    {
        return $this->update($user, $patungan) && $patungan->status->isOpen();
    }

    public function close(User $user, Patungan $patungan): bool
    {
        return $this->update($user, $patungan);
    }

    public function delete(User $user, Patungan $patungan): bool
    {
        return $this->owns($user, $patungan) && $patungan->collected_amount === 0;
    }

    private function owns(User $user, Patungan $patungan): bool
    {
        return $user->id === $patungan->organizer_id;
    }
}
