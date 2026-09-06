<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_ledgers', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('patungan_id')->nullable()->constrained('patungans')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('settlement_id')->nullable()->constrained('settlements')->nullOnDelete();

            $table->string('type', 40);
            $table->string('direction', 10);
            $table->unsignedBigInteger('amount');
            $table->bigInteger('balance_after')->nullable();
            $table->char('currency', 3)->default('IDR');

            /*
             * Stable business key for the entry. Combined with the type it makes ledger
             * writes idempotent, so a replayed webhook cannot credit an organizer twice.
             */
            $table->string('reference', 100);
            $table->string('description', 180);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['type', 'reference'], 'wallet_ledgers_type_reference_unique');
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_ledgers');
    }
};
