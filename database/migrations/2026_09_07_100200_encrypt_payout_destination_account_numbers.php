<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Encrypts stored bank account numbers at rest.
 *
 * The column also has to grow: a Laravel-encrypted payload is far longer than
 * the 40 characters a plain account number needed. The last four digits are
 * split out so the masked label can still be rendered without decrypting.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_destinations', function (Blueprint $table) {
            $table->string('account_last4', 4)->nullable()->after('account_number');
        });

        Schema::table('payout_destinations', function (Blueprint $table) {
            $table->text('account_number')->change();
        });

        DB::table('payout_destinations')->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $number = (string) $row->account_number;

                if ($number === '' || $this->looksEncrypted($number)) {
                    continue;
                }

                DB::table('payout_destinations')->where('id', $row->id)->update([
                    'account_number' => Crypt::encryptString($number),
                    'account_last4' => substr($number, -4),
                ]);
            }
        });
    }

    public function down(): void
    {
        DB::table('payout_destinations')->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $stored = (string) $row->account_number;

                if (! $this->looksEncrypted($stored)) {
                    continue;
                }

                try {
                    $plain = Crypt::decryptString($stored);
                } catch (Throwable) {
                    continue;
                }

                DB::table('payout_destinations')->where('id', $row->id)->update(['account_number' => $plain]);
            }
        });

        Schema::table('payout_destinations', function (Blueprint $table) {
            $table->string('account_number', 40)->change();
            $table->dropColumn('account_last4');
        });
    }

    /** Laravel's encrypter emits base64 of a JSON envelope with iv/value/mac. */
    private function looksEncrypted(string $value): bool
    {
        $decoded = base64_decode($value, true);

        if ($decoded === false) {
            return false;
        }

        $payload = json_decode($decoded, true);

        return is_array($payload) && isset($payload['iv'], $payload['value'], $payload['mac']);
    }
};
