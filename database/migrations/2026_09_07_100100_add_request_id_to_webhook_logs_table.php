<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webhook_logs', function (Blueprint $table) {
            /*
             * The provider's own id for this delivery - DOKU sends X-EXTERNAL-ID.
             * The unique index makes a replayed notification collide at the
             * database rather than relying on application checks alone.
             */
            $table->string('request_id', 64)->nullable()->after('provider');

            $table->unique(['provider', 'request_id'], 'webhook_logs_provider_request_unique');
        });
    }

    public function down(): void
    {
        Schema::table('webhook_logs', function (Blueprint $table) {
            $table->dropUnique('webhook_logs_provider_request_unique');
            $table->dropColumn('request_id');
        });
    }
};
