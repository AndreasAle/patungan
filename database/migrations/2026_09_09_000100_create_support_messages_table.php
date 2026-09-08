<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Messages left through the help bubble.
 *
 * Anyone can write one - a payer with a stuck QRIS has no account and no other
 * way to reach anybody - so the table holds only what is needed to answer:
 * a name, one way to reply, and what they said. No IP, no fingerprint; the
 * route is rate limited instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();

            // Set when a signed-in organizer writes; null for a payer.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('name', 80);
            $table->string('contact', 120);
            $table->text('message');

            // Where they were when they asked - the difference between a payment
            // page and the pricing section is most of the context.
            $table->string('page', 200)->nullable();

            $table->string('status', 20)->default('NEW');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->text('note')->nullable();

            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
