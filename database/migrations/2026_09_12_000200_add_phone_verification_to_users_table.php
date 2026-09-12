<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A verified phone number for organizers.
 *
 * This exists for one job: a second channel that still reaches the real owner
 * when the first one is compromised. An email-only alert saying "a new payout
 * account was added" is worthless precisely in the case it matters most, which
 * is somebody who got into the email.
 *
 * Mirrors the email verification columns deliberately - same shape, same
 * hashing, same attempt counter - so there is one pattern to understand rather
 * than two.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('phone_verified_at')->nullable()->after('phone');
            // Hashed, so a database dump never hands out working codes.
            $table->string('phone_verification_code')->nullable()->after('phone_verified_at');
            $table->timestamp('phone_verification_sent_at')->nullable()->after('phone_verification_code');
            $table->timestamp('phone_verification_expires_at')->nullable()->after('phone_verification_sent_at');
            $table->unsignedTinyInteger('phone_verification_attempts')->default(0)->after('phone_verification_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone_verified_at',
                'phone_verification_code',
                'phone_verification_sent_at',
                'phone_verification_expires_at',
                'phone_verification_attempts',
            ]);
        });
    }
};
