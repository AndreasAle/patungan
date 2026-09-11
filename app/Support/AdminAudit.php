<?php

namespace App\Support;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Records what an administrator did.
 *
 * The actor's name and email are copied onto the row rather than only
 * referenced. An audit line that reads "user #7 completed a payout" stops being
 * useful the moment account 7 is renamed or deleted, which is exactly when
 * somebody is reading it.
 *
 * Writing a log entry must never be what stops an administrator doing their
 * job, so a failure here is logged and swallowed. The trade-off is deliberate
 * and worth naming: an action can, in the worst case, happen without a record.
 * The alternative - refusing to complete a payout because an audit insert
 * failed - strands somebody's money over bookkeeping.
 */
class AdminAudit
{
    public const USER_SUSPENDED = 'user.suspended';

    public const USER_RESTORED = 'user.restored';

    public const PATUNGAN_STATUS_CHANGED = 'patungan.status_changed';

    public const SETTLEMENT_PROCESSED = 'settlement.processed';

    public const SUPPORT_MESSAGE_UPDATED = 'support.updated';

    /** Moving data out of the system, where no later access control reaches it. */
    public const DATA_EXPORTED = 'data.exported';

    /** @param array<string, mixed> $context */
    public static function record(
        User $actor,
        string $action,
        ?Model $subject = null,
        ?string $subjectLabel = null,
        array $context = [],
        ?string $ip = null,
    ): void {
        try {
            AdminAuditLog::create([
                'actor_id' => $actor->id,
                'actor_name' => $actor->name,
                'actor_email' => $actor->email,
                'action' => $action,
                'subject_type' => $subject === null ? null : class_basename($subject),
                'subject_id' => $subject === null ? null : (string) ($subject->uuid ?? $subject->getKey()),
                'subject_label' => $subjectLabel,
                'context' => $context ?: null,
                'ip_address' => $ip,
                'created_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::error('Admin action could not be audited', [
                'action' => $action,
                'actor' => $actor->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
