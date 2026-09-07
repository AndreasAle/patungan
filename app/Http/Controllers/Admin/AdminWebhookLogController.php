<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WebhookLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminWebhookLogController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        $logs = WebhookLog::query()
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/webhooks', [
            'filters' => ['status' => $status],
            'statuses' => [
                WebhookLog::STATUS_RECEIVED,
                WebhookLog::STATUS_PROCESSED,
                WebhookLog::STATUS_DUPLICATE,
                WebhookLog::STATUS_IGNORED,
                WebhookLog::STATUS_REJECTED,
                WebhookLog::STATUS_FAILED,
            ],
            'logs' => [
                'data' => collect($logs->items())->map(fn (WebhookLog $log) => [
                    'id' => $log->id,
                    'provider' => $log->provider,
                    'event_type' => $log->event_type,
                    'external_id' => $log->external_id,
                    // The provider's delivery id - what a redelivery is matched on.
                    'request_id' => $log->request_id,
                    'signature_valid' => $log->signature_valid,
                    'status' => $log->status,
                    'error' => $log->error,
                    // Already sanitised on write - no credentials reach this view.
                    'payload' => $log->payload,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->all(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
