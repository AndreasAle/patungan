<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Settlement;
use App\Support\AdminAudit;
use App\Support\AdminWindow;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV for the two tables finance actually reconciles against.
 *
 * Streamed and chunked rather than collected into an array first: an export is
 * the one admin request whose size grows without limit, and the version that
 * works fine on a thousand rows is the version that takes the site down at a
 * hundred thousand.
 *
 * Every export is audited. This is the one admin action that moves customer
 * names and payment references *out* of the system, where no later access
 * control applies to them - so "who pulled this file, when, and covering what
 * period" has to be answerable. The row records the filters, never the contents.
 */
class AdminExportController extends Controller
{
    private const CHUNK = 500;

    public function __invoke(Request $request, string $dataset): StreamedResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:32'],
        ]);

        abort_unless(in_array($dataset, ['payments', 'settlements'], true), 404);

        $window = AdminWindow::fromRequest($request);
        $status = $validated['status'] ?? '';

        AdminAudit::record(
            $request->user(),
            AdminAudit::DATA_EXPORTED,
            null,
            $dataset,
            ['range' => $window->key, 'status' => $status ?: 'semua'],
            $request->ip(),
        );

        $filename = sprintf('patungan-%s-%s-%s.csv', $dataset, $window->key, now()->format('Ymd-His'));

        return response()->streamDownload(
            fn () => $dataset === 'payments'
                ? $this->streamPayments($window, $status)
                : $this->streamSettlements($window, $status),
            $filename,
            ['Content-Type' => 'text/csv; charset=UTF-8'],
        );
    }

    private function streamPayments(AdminWindow $window, string $status): void
    {
        $handle = $this->open([
            'reference', 'external_id', 'provider_reference', 'gateway', 'status',
            'patungan', 'peserta', 'penyelenggara',
            'amount', 'service_fee', 'charged_amount', 'gateway_fee', 'platform_fee', 'net_amount',
            'created_at', 'paid_at',
        ]);

        $query = Payment::query()->with(['organizer:id,name', 'patungan:id,title', 'participant:id,name']);
        $window->scope($query, 'created_at');

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->chunkById(self::CHUNK, function ($payments) use ($handle): void {
            foreach ($payments as $payment) {
                fputcsv($handle, [
                    $payment->gateway_reference,
                    $payment->external_id,
                    $payment->gateway_transaction_id,
                    $payment->gateway,
                    $payment->status->value,
                    $payment->patungan?->title,
                    $payment->participant?->name,
                    $payment->organizer?->name,
                    $payment->amount,
                    $payment->service_fee,
                    $payment->charged_amount,
                    $payment->gateway_fee,
                    $payment->platform_fee,
                    $payment->net_amount,
                    $payment->created_at?->toIso8601String(),
                    $payment->paid_at?->toIso8601String(),
                ]);
            }
        });

        fclose($handle);
    }

    private function streamSettlements(AdminWindow $window, string $status): void
    {
        $handle = $this->open([
            'uuid', 'penyelenggara', 'status', 'provider', 'provider_reference',
            'tujuan', 'atas_nama', 'amount', 'fee', 'net_amount',
            'requested_at', 'processed_at', 'failed_at', 'failure_reason',
        ]);

        $query = Settlement::query()->with('organizer:id,name');
        $window->scope($query, 'requested_at');

        if ($status !== '') {
            $query->where('status', $status);
        }

        $query->chunkById(self::CHUNK, function ($settlements) use ($handle): void {
            foreach ($settlements as $settlement) {
                fputcsv($handle, [
                    $settlement->uuid,
                    $settlement->organizer?->name,
                    $settlement->status->value,
                    $settlement->provider,
                    $settlement->provider_reference,
                    // Already masked when the settlement was created - the full
                    // account number is not in this column and must not be.
                    $settlement->destination_account_reference,
                    $settlement->destination_holder_name,
                    $settlement->amount,
                    $settlement->fee,
                    $settlement->net_amount,
                    $settlement->requested_at?->toIso8601String(),
                    $settlement->processed_at?->toIso8601String(),
                    $settlement->failed_at?->toIso8601String(),
                    $settlement->failure_reason,
                ]);
            }
        });

        fclose($handle);
    }

    /**
     * @param  list<string>  $headers
     * @return resource
     */
    private function open(array $headers)
    {
        $handle = fopen('php://output', 'w');

        // Excel on Windows reads a BOM-less UTF-8 CSV as the system codepage,
        // which turns every Indonesian name with an accent into mojibake. The
        // people opening this file open it in Excel.
        fwrite($handle, "\xEF\xBB\xBF");
        fputcsv($handle, $headers);

        return $handle;
    }
}
