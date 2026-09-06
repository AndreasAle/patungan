<?php

use App\Enums\NamePrivacy;
use App\Enums\PatunganCategory;
use App\Enums\PatunganStatus;
use App\Enums\SplitType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patungans', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            // Unguessable public identifier used by the share link. Never expose the id.
            $table->string('public_token', 32)->unique();
            $table->string('slug', 140)->nullable();

            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();

            $table->string('title', 120);
            $table->text('description')->nullable();
            $table->string('category', 20)->default(PatunganCategory::Lainnya->value);

            $table->string('split_type', 10)->default(SplitType::Equal->value);
            $table->string('status', 20)->default(PatunganStatus::Active->value);
            $table->string('name_privacy', 10)->default(NamePrivacy::Full->value);
            $table->char('currency', 3)->default('IDR');

            // All money is stored as integer rupiah.
            $table->unsignedBigInteger('equal_amount')->nullable();
            $table->unsignedBigInteger('target_amount')->default(0);
            $table->unsignedBigInteger('collected_amount')->default(0);
            $table->unsignedInteger('participant_count')->default(0);
            $table->unsignedInteger('paid_participant_count')->default(0);

            $table->date('event_date')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['organizer_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patungans');
    }
};
