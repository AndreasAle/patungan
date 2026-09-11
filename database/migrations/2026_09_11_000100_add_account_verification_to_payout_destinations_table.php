<?php

use App\Enums\AccountVerificationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records what the bank said about a payout destination.
 *
 * The terms already say a destination must be in the organizer's own name.
 * Until now nothing enforced that: the account holder was simply typed in, so
 * anybody could put any name against any account number. These two columns are
 * what turns that sentence into something the system can actually check.
 *
 * Existing rows default to UNVERIFIED rather than being backfilled as verified.
 * Nothing was ever checked for them, and recording an unearned VERIFIED would
 * be worse than recording nothing at all.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_destinations', function (Blueprint $table) {
            $table->string('verification_status', 20)
                ->default(AccountVerificationStatus::Unverified->value)
                ->after('account_holder');

            /*
             * The name the bank returned, kept separately from account_holder.
             * They are different facts - one is what the owner claims, the
             * other is what the bank says - and overwriting the first with the
             * second would destroy the evidence that they ever disagreed.
             */
            $table->string('verified_account_holder', 120)->nullable()->after('verification_status');
        });
    }

    public function down(): void
    {
        Schema::table('payout_destinations', function (Blueprint $table) {
            $table->dropColumn(['verification_status', 'verified_account_holder']);
        });
    }
};
