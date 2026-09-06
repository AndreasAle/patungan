<?php

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            $table->foreignId('patungan_id')->constrained('patungans')->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained('patungan_participants')->cascadeOnDelete();
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();

            $table->string('gateway', 32);
            // Our own order reference sent to the gateway - always unique.
            $table->string('gateway_reference', 64)->unique();
            // The provider's own transaction id, known once the charge is accepted.
            $table->string('gateway_transaction_id', 100)->nullable();

            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('service_fee')->default(0);
            $table->unsignedBigInteger('charged_amount');
            $table->unsignedBigInteger('gateway_fee')->default(0);
            $table->unsignedBigInteger('platform_fee')->default(0);
            $table->unsignedBigInteger('fee')->default(0);
            $table->unsignedBigInteger('net_amount')->default(0);
            $table->char('currency', 3)->default('IDR');

            $table->string('payment_method', 20)->default(PaymentMethod::Qris->value);
            $table->string('status', 20)->default(PaymentStatus::Pending->value);

            $table->text('qr_string')->nullable();
            $table->string('qr_url', 500)->nullable();

            /*
             * Holds the participant id while the payment is PENDING and NULL otherwise,
             * so the unique index below guarantees at most one active invoice per
             * participant even under concurrent requests.
             */
            $table->unsignedBigInteger('active_participant_id')->nullable();

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->unique(['gateway', 'gateway_transaction_id'], 'payments_gateway_txn_unique');
            $table->unique('active_participant_id', 'payments_active_participant_unique');
            $table->index(['patungan_id', 'status']);
            $table->index(['organizer_id', 'status']);
            $table->index(['status', 'expires_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
