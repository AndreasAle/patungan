<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            /*
             * SNAP providers such as DOKU identify each API call by an
             * X-EXTERNAL-ID rather than by our order reference, so support has
             * no way to find a call in the provider's logs without it.
             */
            $table->string('external_id', 40)->nullable()->after('gateway_transaction_id');

            $table->index('external_id', 'payments_external_id_index');
            $table->index('participant_id', 'payments_participant_id_index');
            $table->index(['gateway', 'status'], 'payments_gateway_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_external_id_index');
            $table->dropIndex('payments_participant_id_index');
            $table->dropIndex('payments_gateway_status_index');
            $table->dropColumn('external_id');
        });
    }
};
