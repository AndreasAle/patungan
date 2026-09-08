<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SupportMessageStatus;
use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminSupportMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->trim()->toString();

        $messages = SupportMessage::query()
            ->with('user:id,name')
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($search !== '', fn ($query) => $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            }))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/support', [
            'filters' => ['status' => $status, 'search' => $search],
            'statuses' => array_map(
                fn (SupportMessageStatus $s) => ['value' => $s->value, 'label' => $s->label()],
                SupportMessageStatus::cases(),
            ),
            'unread' => SupportMessage::query()->where('status', SupportMessageStatus::New->value)->count(),
            'messages' => [
                'data' => collect($messages->items())->map(fn (SupportMessage $message) => [
                    'uuid' => $message->uuid,
                    'name' => $message->name,
                    'contact' => $message->contact,
                    'message' => $message->message,
                    'page' => $message->page,
                    'account' => $message->user?->name,
                    'status' => $message->status->value,
                    'status_label' => $message->status->label(),
                    'created_at' => $message->created_at?->toIso8601String(),
                    'replied_at' => $message->replied_at?->toIso8601String(),
                ])->all(),
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    /** Moves one message along: read, answered, or done with. */
    public function update(Request $request, SupportMessage $message): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', array_column(SupportMessageStatus::cases(), 'value'))],
        ]);

        $status = SupportMessageStatus::from($data['status']);

        $message->forceFill([
            'status' => $status->value,
            'read_at' => $message->read_at ?? now(),
            'replied_at' => $status === SupportMessageStatus::Replied ? ($message->replied_at ?? now()) : $message->replied_at,
        ])->save();

        return back()->with('success', 'Status pesan diperbarui.');
    }
}
