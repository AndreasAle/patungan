<?php

use App\Enums\SettlementStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('patungan_id')->nullable()->constrained('patungans')->nullOnDelete();
            $table->foreignId('payout_destination_id')->nullable()->constrained('payout_destinations')->nullOnDelete();

            $table->string('destination_type', 20);
            // Masked snapshot of the destination at request time, e.g. "BCA ****8291".
            $table->string('destination_account_reference', 80);
            $table->string('destination_holder_name', 80);

            $table->unsignedBigInteger('amount');
            $table->unsignedBigInteger('fee')->default(0);
            $table->unsignedBigInteger('net_amount');
            $table->char('currency', 3)->default('IDR');

            $table->string('provider', 32);
            $table->string('provider_reference', 100)->nullable();
            $table->string('status', 20)->default(SettlementStatus::Pending->value);

            $table->timestamp('requested_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->foreignId('processed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['organizer_id', 'status']);
            $table->index(['status', 'requested_at']);
            $table->unique(['provider', 'provider_reference'], 'settlements_provider_reference_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
