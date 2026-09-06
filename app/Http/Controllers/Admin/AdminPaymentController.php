<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminPaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();

        $payments = Payment::query()
            ->with(['organizer:id,name', 'patungan:id,title', 'participant:id,name'])
            ->when($search !== '', fn ($query) => $query->where('gateway_reference', 'like', "%{$search}%"))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/payments', [
            'filters' => ['search' => $search, 'status' => $status],
            'statuses' => array_map(fn (PaymentStatus $s) => ['value' => $s->value, 'label' => $s->label()], PaymentStatus::cases()),
            'payments' => [
                'data' => collect($payments->items())->map(fn (Payment $payment) => [
                    'uuid' => $payment->uuid,
                    'reference' => $payment->gateway_reference,
                    'organizer' => $payment->organizer->name,
                    'patungan' => $payment->patungan->title,
                    'participant' => $payment->participant->name,
                    'amount' => $payment->amount,
                    'charged_amount' => $payment->charged_amount,
                    'fee' => $payment->fee,
                    'net_amount' => $payment->net_amount,
                    'gateway' => $payment->gateway,
                    'status' => $payment->status->value,
                    'status_label' => $payment->status->label(),
                    'created_at' => $payment->created_at?->toIso8601String(),
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                ])->all(),
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
            ],
        ]);
    }
}
