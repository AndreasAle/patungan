<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\LedgerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function __construct(private readonly LedgerService $ledger) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $users = User::query()
            ->withCount('patungans')
            ->when($search !== '', fn ($query) => $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'search' => $search,
            'users' => [
                'data' => collect($users->items())->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'suspended' => $user->isSuspended(),
                    'patungans_count' => $user->patungans_count,
                    'balance' => $this->ledger->availableBalance($user),
                    'created_at' => $user->created_at?->toIso8601String(),
                ])->all(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Kamu tidak bisa membekukan akunmu sendiri.');

        $user->forceFill(['suspended_at' => now()])->save();

        return back()->with('success', $user->name.' dibekukan.');
    }

    public function restore(User $user): RedirectResponse
    {
        $user->forceFill(['suspended_at' => null])->save();

        return back()->with('success', $user->name.' diaktifkan lagi.');
    }
}
