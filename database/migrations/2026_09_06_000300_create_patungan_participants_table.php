<?php

use App\Enums\ParticipantStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patungan_participants', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            $table->foreignId('patungan_id')->constrained('patungans')->cascadeOnDelete();

            // Names are display data only - never an identifier. Duplicates are allowed.
            $table->string('name', 80);
            $table->string('note', 120)->nullable();

            $table->unsignedBigInteger('amount_due');
            $table->unsignedBigInteger('amount_paid')->default(0);
            $table->string('status', 20)->default(ParticipantStatus::Unpaid->value);
            $table->string('paid_method', 20)->nullable();

            $table->unsignedInteger('position')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('marked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['patungan_id', 'status']);
            $table->index(['patungan_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patungan_participants');
    }
};
