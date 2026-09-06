<?php

namespace App\Support;

use App\Contracts\DnsResolver;
use Illuminate\Support\Facades\Cache;

/**
 * Looks the domain up in real DNS.
 *
 * A domain with no MX record - and no A record to fall back on - cannot receive
 * mail at all, which is what catches typos like "gmial.com" and invented
 * domains. Results are cached briefly so a burst of signups from one domain
 * does not mean a lookup each time.
 */
class SystemDnsResolver implements DnsResolver
{
    public function acceptsMail(string $domain): bool
    {
        return Cache::remember(
            'dns.mail.'.strtolower($domain),
            now()->addHours(6),
            fn () => checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A'),
        );
    }
}
