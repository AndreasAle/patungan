<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records the payer's time zone on the payment, so an organizer can see where
 * their money is coming from.
 *
 * Deliberately four characters of coarse geography and nothing else. No IP, no
 * coordinates, no city: this column cannot single anyone out even if the whole
 * table leaked, which is the only reason it is acceptable to keep at all.
 *
 * Nullable, and it stays null for every payment taken before today. The
 * dashboard reports the sample size rather than presenting an incomplete
 * history as if it were the whole picture.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('payer_zone', 4)->nullable()->after('payment_method');

            // The dashboard groups paid payments by zone for one organizer.
            $table->index(['organizer_id', 'status', 'payer_zone'], 'payments_zone_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_zone_idx');
            $table->dropColumn('payer_zone');
        });
    }
};
