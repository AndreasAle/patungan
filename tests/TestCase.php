<?php

namespace Tests;

use App\Contracts\DnsResolver;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Keep the suite off the network. Tests that care about the domain
        // check bind their own resolver.
        $this->app->bind(DnsResolver::class, fn () => new class implements DnsResolver
        {
            public function acceptsMail(string $domain): bool
            {
                return true;
            }
        });
    }
}
