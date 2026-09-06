<?php

namespace App\Rules;

use App\Contracts\DnsResolver;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Str;

/**
 * Rejects an address whose domain cannot receive mail at all.
 *
 * This is a domain check, not a mailbox check - proving a specific inbox exists
 * is only possible by sending to it, which is what the verification link does.
 */
class RealEmailDomain implements ValidationRule
{
    public function __construct(private readonly DnsResolver $dns) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Str::contains($value, '@')) {
            return;
        }

        $domain = Str::afterLast($value, '@');

        if ($domain === '' || ! $this->dns->acceptsMail($domain)) {
            $fail('Domain email :input tidak bisa menerima email. Cek lagi penulisannya.');
        }
    }
}
