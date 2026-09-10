<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A personal payment token per participant.
 *
 * The point of the whole feature is that an organizer can send one person a
 * link that opens straight onto their own bill. That link travels through
 * WhatsApp, gets forwarded, and ends up in screenshots, so the token has to be
 * something that reveals nothing and grants nothing beyond one participant's
 * own row.
 *
 * Nullable and generated on demand rather than for every participant up front:
 * most participants are never chased individually, and a token that was never
 * created cannot leak.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patungan_participants', function (Blueprint $table) {
            /*
             * Unique across the whole table, not per patungan. The lookup is by
             * token alone, so a value repeated under another patungan would
             * make the route ambiguous - and ambiguity here means showing
             * somebody another person's bill.
             */
            $table->string('pay_token', 32)->nullable()->unique()->after('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('patungan_participants', function (Blueprint $table) {
            $table->dropUnique(['pay_token']);
            $table->dropColumn('pay_token');
        });
    }
};
