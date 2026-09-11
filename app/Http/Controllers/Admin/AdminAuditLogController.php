<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Support\AdminAudit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reading the audit trail.
 *
 * A record nobody can read is not an audit trail, it is a table. This is the
 * page that makes the writing worthwhile: who did what, to whom, and from
 * where.
 *
 * Deliberately read-only, with no route to edit or delete a row. An audit log an
 * administrator can quietly revise is worse than none, because it carries the
 * authority of a record without the guarantee.
 */
class AdminAuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->string('action')->toString();
        $search = trim($request->string('q')->toString());

        $logs = AdminAuditLog::query()
            ->when($action !== '', fn ($query) => $query->where('action', $action))
            ->when($search !== '', function ($query) use ($search) {
                // Who did it and what it was done to - the two things anyone
                // actually arrives at this page holding.
                $query->where(function ($inner) use ($search) {
                    $inner->where('actor_name', 'like', "%{$search}%")
                        ->orWhere('actor_email', 'like', "%{$search}%")
                        ->orWhere('subject_label', 'like', "%{$search}%")
                        ->orWhere('subject_id', 'like', "%{$search}%");
                });
            })
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('admin/audit', [
            'filters' => ['action' => $action, 'q' => $search],
            'actions' => [
                AdminAudit::USER_SUSPENDED,
                AdminAudit::USER_RESTORED,
                AdminAudit::PATUNGAN_STATUS_CHANGED,
                AdminAudit::SETTLEMENT_PROCESSED,
                AdminAudit::SUPPORT_MESSAGE_UPDATED,
            ],
            'logs' => [
                'data' => collect($logs->items())->map(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'actor_name' => $log->actor_name,
                    'actor_email' => $log->actor_email,
                    'action' => $log->action,
                    'subject_type' => $log->subject_type,
                    'subject_id' => $log->subject_id,
                    'subject_label' => $log->subject_label,
                    'context' => $log->context,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->all(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
