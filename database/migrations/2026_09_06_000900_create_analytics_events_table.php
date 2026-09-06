<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();

            $table->string('name', 60);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('patungan_id')->nullable()->constrained('patungans')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();

            // Hashed visitor key - never a raw IP address.
            $table->string('visitor_hash', 64)->nullable();
            $table->json('properties')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['name', 'created_at']);
            $table->index('patungan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
