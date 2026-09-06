<?php

namespace App\Contracts;

interface DnsResolver
{
    /** Whether the domain publishes a way to receive mail. */
    public function acceptsMail(string $domain): bool;
}
