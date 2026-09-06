<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patungan_participants', function (Blueprint $table) {
            // Issued once a participant is settled, by QRIS or by cash.
            $table->string('invoice_number', 32)->nullable()->unique()->after('paid_method');
        });
    }

    public function down(): void
    {
        Schema::table('patungan_participants', function (Blueprint $table) {
            $table->dropUnique(['invoice_number']);
            $table->dropColumn('invoice_number');
        });
    }
};
