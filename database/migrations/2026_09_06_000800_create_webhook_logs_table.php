<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_logs', function (Blueprint $table) {
            $table->id();

            $table->string('provider', 32);
            $table->string('event_type', 64)->nullable();
            $table->string('external_id', 100)->nullable();

            // Payload is stored sanitised - see WebhookLog::sanitise().
            $table->json('payload');
            $table->boolean('signature_valid')->default(false);
            $table->string('status', 20);
            $table->timestamp('processed_at')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['provider', 'external_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_logs');
    }
};
