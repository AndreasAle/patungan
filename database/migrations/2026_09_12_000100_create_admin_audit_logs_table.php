<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who did what, on a platform that holds other people's money.
 *
 * Admins can freeze an account, reopen a closed patungan and mark a payout as
 * transferred. None of that was recorded anywhere. If a payout were marked
 * complete and the money never arrived, there was no way to say which
 * administrator did it, when, or from where - and "we cannot tell" is not an
 * answer a platform handling third-party funds can give.
 *
 * Deliberately append-only in practice: nothing in the application updates or
 * deletes a row here. A log an operator can edit is not evidence.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();

            /*
             * Nulled rather than cascaded if the administrator's account is
             * ever deleted. Losing the actor is bad; losing the record that the
             * action happened at all would be worse.
             */
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name', 120);
            $table->string('actor_email', 190);

            $table->string('action', 60);

            // Polymorphic by hand: a string pair reads better in a log than a
            // morph map that has to be resolved to be understood.
            $table->string('subject_type', 60)->nullable();
            $table->string('subject_id', 64)->nullable();
            $table->string('subject_label', 190)->nullable();

            /*
             * Context, never a full model dump. These rows are read by people
             * investigating an incident, and a wall of serialised state buries
             * the one field that mattered.
             */
            $table->json('context')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['action', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index('actor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
    }
};
