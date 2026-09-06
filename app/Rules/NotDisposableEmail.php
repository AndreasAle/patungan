<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;

/**
 * Blocks throwaway inboxes.
 *
 * Someone using a ten-minute address cannot be reached again once money is
 * involved - not for a receipt, a payout question, or a dispute. The list lives
 * in config/patungan.php so it can grow without a code change.
 */
class NotDisposableEmail implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Str::contains($value, '@')) {
            return;
        }

        $domain = Str::lower(Str::afterLast($value, '@'));
        $blocked = (array) config('patungan.email.disposable_domains', []);

        foreach ($blocked as $blockedDomain) {
            // Match the domain itself and any subdomain of it.
            if ($domain === $blockedDomain || Str::endsWith($domain, '.'.$blockedDomain)) {
                $fail('Pakai email utama kamu ya, email sekali pakai tidak bisa dipakai di sini.');

                return;
            }
        }
    }
}
