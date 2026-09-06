<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminPatunganController;
use App\Http\Controllers\Admin\AdminPaymentController;
use App\Http\Controllers\Admin\AdminSettlementController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminWebhookLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ParticipantController;
use App\Http\Controllers\PatunganController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\PayoutDestinationController;
use App\Http\Controllers\ProfileHubController;
use App\Http\Controllers\Public\InvoiceController;
use App\Http\Controllers\Public\PublicPatunganController;
use App\Http\Controllers\Public\PublicPaymentController;
use App\Http\Controllers\Public\RoomAccessController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\Webhooks\PaymentWebhookController;
use App\Http\Controllers\Webhooks\SandboxSimulatorController;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

/*
|--------------------------------------------------------------------------
| Public share links - no authentication, ever
|--------------------------------------------------------------------------
*/
Route::prefix('p/{token}')->name('public.')->group(function () {
    Route::get('/', [PublicPatunganController::class, 'show'])->name('patungan.show');
    Route::get('status', [PublicPatunganController::class, 'status'])
        ->middleware('throttle:60,1')
        ->name('patungan.status');

    Route::post('bayar/{participant}', [PublicPaymentController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('payment.store');

    // Private room: the PIN is the only way in, so attempts are throttled hard.
    Route::post('buka', [RoomAccessController::class, 'unlock'])
        ->middleware('throttle:8,1')
        ->name('room.unlock');
    Route::post('kunci', [RoomAccessController::class, 'lock'])->name('room.lock');

    Route::get('invoice/{participant}', [InvoiceController::class, 'show'])->name('invoice.show');

    Route::get('pembayaran/{payment}', [PublicPaymentController::class, 'show'])->name('payment.show');
    Route::get('pembayaran/{payment}/status', [PublicPaymentController::class, 'status'])
        ->middleware('throttle:120,1')
        ->name('payment.status');
});

/*
|--------------------------------------------------------------------------
| Organizer
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('transaksi', TransactionController::class)->name('transactions.index');
    Route::get('profil', ProfileHubController::class)->name('profile.index');

    Route::get('patungan', [PatunganController::class, 'index'])->name('patungan.index');
    Route::get('patungan/{patungan}', [PatunganController::class, 'show'])->name('patungan.show');

    Route::get('pencairan', [PayoutController::class, 'index'])->name('payout.index');
    Route::get('pencairan/tujuan', [PayoutDestinationController::class, 'index'])->name('payout.destinations');

    // Anything that creates or moves money requires an active account.
    Route::middleware('active')->group(function () {
        Route::get('buat-patungan', [PatunganController::class, 'create'])->name('patungan.create');
        Route::post('patungan', [PatunganController::class, 'store'])->name('patungan.store');
        Route::get('patungan/{patungan}/edit', [PatunganController::class, 'edit'])->name('patungan.edit');
        Route::patch('patungan/{patungan}', [PatunganController::class, 'update'])->name('patungan.update');
        Route::post('patungan/{patungan}/tutup', [PatunganController::class, 'close'])->name('patungan.close');
        Route::post('patungan/{patungan}/buka', [PatunganController::class, 'reopen'])->name('patungan.reopen');

        Route::post('patungan/{patungan}/peserta', [ParticipantController::class, 'store'])->name('participant.store');
        Route::patch('patungan/{patungan}/peserta/{participant}', [ParticipantController::class, 'update'])->name('participant.update');
        Route::delete('patungan/{patungan}/peserta/{participant}', [ParticipantController::class, 'destroy'])->name('participant.destroy');
        Route::post('patungan/{patungan}/peserta/{participant}/lunas', [ParticipantController::class, 'markPaid'])->name('participant.mark-paid');
        Route::delete('patungan/{patungan}/peserta/{participant}/lunas', [ParticipantController::class, 'unmarkPaid'])->name('participant.unmark-paid');

        Route::post('pencairan', [PayoutController::class, 'store'])->name('payout.store');
        Route::post('pencairan/tujuan', [PayoutDestinationController::class, 'store'])->name('payout.destination.store');
        Route::post('pencairan/tujuan/{destination}/utama', [PayoutDestinationController::class, 'makeDefault'])->name('payout.destination.default');
        Route::delete('pencairan/tujuan/{destination}', [PayoutDestinationController::class, 'destroy'])->name('payout.destination.destroy');
    });
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', AdminDashboardController::class)->name('dashboard');

    Route::get('users', [AdminUserController::class, 'index'])->name('users');
    Route::post('users/{user}/suspend', [AdminUserController::class, 'suspend'])->name('users.suspend');
    Route::post('users/{user}/restore', [AdminUserController::class, 'restore'])->name('users.restore');

    Route::get('patungans', [AdminPatunganController::class, 'index'])->name('patungans');
    Route::post('patungans/{patungan}/status', [AdminPatunganController::class, 'updateStatus'])->name('patungans.status');

    Route::get('payments', [AdminPaymentController::class, 'index'])->name('payments');

    Route::get('settlements', [AdminSettlementController::class, 'index'])->name('settlements');
    Route::post('settlements/{settlement}', [AdminSettlementController::class, 'update'])->name('settlements.update');

    Route::get('webhooks', [AdminWebhookLogController::class, 'index'])->name('webhooks');
});

/*
|--------------------------------------------------------------------------
| Payment gateway webhooks - no session, no CSRF, signature verified inside
|--------------------------------------------------------------------------
*/
Route::post('webhooks/payments/{provider}', PaymentWebhookController::class)
    ->withoutMiddleware([ValidateCsrfToken::class])
    ->middleware('throttle:240,1')
    ->name('webhooks.payments');

// Local-only helper that fires a signed sandbox notification.
if (app()->environment(['local', 'testing'])) {
    Route::post('dev/sandbox/{payment}/pay', SandboxSimulatorController::class)
        ->withoutMiddleware([ValidateCsrfToken::class])
        ->name('dev.sandbox.pay');
}

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
