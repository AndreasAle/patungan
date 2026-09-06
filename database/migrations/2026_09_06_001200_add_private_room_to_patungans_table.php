<?php

use App\Enums\PatunganPrivacy;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patungans', function (Blueprint $table) {
            $table->string('privacy_mode', 20)->default(PatunganPrivacy::Open->value)->after('name_privacy');
        });

        Schema::table('patungan_participants', function (Blueprint $table) {
            /*
             * The organizer has to be able to read this back to hand it over, so
             * it is encrypted at rest rather than hashed. Attempts are throttled
             * and the PIN only unlocks one participant's own bill.
             */
            $table->text('access_pin')->nullable()->after('invoice_number');
            $table->string('access_pin_lookup', 64)->nullable()->after('access_pin');

            $table->unique(['patungan_id', 'access_pin_lookup'], 'participants_patungan_pin_unique');
        });
    }

    public function down(): void
    {
        Schema::table('patungan_participants', function (Blueprint $table) {
            $table->dropUnique('participants_patungan_pin_unique');
            $table->dropColumn(['access_pin', 'access_pin_lookup']);
        });

        Schema::table('patungans', function (Blueprint $table) {
            $table->dropColumn('privacy_mode');
        });
    }
};
