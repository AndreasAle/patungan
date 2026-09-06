<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Hashed, so a database dump never hands out working codes.
            $table->string('email_verification_code')->nullable()->after('avatar_url');
            $table->timestamp('email_verification_sent_at')->nullable()->after('email_verification_code');
            $table->timestamp('email_verification_expires_at')->nullable()->after('email_verification_sent_at');
            $table->unsignedTinyInteger('email_verification_attempts')->default(0)->after('email_verification_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'email_verification_code',
                'email_verification_sent_at',
                'email_verification_expires_at',
                'email_verification_attempts',
            ]);
        });
    }
};
