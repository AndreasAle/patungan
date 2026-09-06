<?php

use App\Enums\PayoutDestinationType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_destinations', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20)->default(PayoutDestinationType::Bank->value);

            // Bank or e-wallet code as understood by the payout provider, e.g. "bca".
            $table->string('provider_code', 40);
            $table->string('provider_label', 80);
            $table->string('account_number', 40);
            $table->string('account_holder', 80);

            $table->boolean('is_default')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_destinations');
    }
};
