<?php

namespace Tests\Feature;

use App\Enums\PayerZone;
use App\Support\PayerZoneResolver;
use Tests\TestCase;

/*
 * The payer zone is analytics, and analytics is never allowed to change what
 * somebody is charged or whether their payment goes through. Most of what is
 * asserted here is therefore about absent and hostile input rather than the
 * happy path: the value arrives from the payer's own browser and can be
 * anything at all.
 */
class PayerZoneTest extends TestCase
{
    private PayerZoneResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resolver = new PayerZoneResolver;
    }

    public function test_it_maps_every_indonesian_timezone(): void
    {
        $this->assertSame(PayerZone::Wib, $this->resolver->fromTimezone('Asia/Jakarta'));
        // Left out of a naive three-zone map, which would file every payer in
        // West Kalimantan as an overseas payer.
        $this->assertSame(PayerZone::Wib, $this->resolver->fromTimezone('Asia/Pontianak'));
        $this->assertSame(PayerZone::Wita, $this->resolver->fromTimezone('Asia/Makassar'));
        $this->assertSame(PayerZone::Wit, $this->resolver->fromTimezone('Asia/Jayapura'));
    }

    public function test_it_ignores_casing_and_padding(): void
    {
        $this->assertSame(PayerZone::Wib, $this->resolver->fromTimezone('  asia/JAKARTA  '));
    }

    public function test_it_files_a_genuine_foreign_timezone_as_overseas(): void
    {
        foreach (['Asia/Singapore', 'Europe/Amsterdam', 'America/New_York', 'UTC', 'GMT+7'] as $timezone) {
            $this->assertSame(PayerZone::Overseas, $this->resolver->fromTimezone($timezone), $timezone);
        }
    }

    public function test_it_records_nothing_rather_than_guessing_when_the_value_is_junk(): void
    {
        /*
         * "unknown" is the one that matters. Without a shape check it would pass
         * as a foreign timezone and quietly inflate the overseas slice of the
         * chart with browsers that simply did not answer.
         */
        foreach ([null, '', '   ', 'unknown', 'undefined', 'null', '12345'] as $timezone) {
            $this->assertNull($this->resolver->fromTimezone($timezone), var_export($timezone, true));
        }
    }

    public function test_it_refuses_a_value_longer_than_any_real_identifier(): void
    {
        $this->assertNull($this->resolver->fromTimezone('Asia/'.str_repeat('a', 200)));
    }

    public function test_it_does_not_accept_an_injected_payload(): void
    {
        $this->assertNull($this->resolver->fromTimezone("Asia/Jakarta'; DROP TABLE payments; --"));
        $this->assertNull($this->resolver->fromTimezone('<script>alert(1)</script>'));
    }

    public function test_every_zone_has_a_label_and_an_island_list(): void
    {
        foreach (PayerZone::cases() as $zone) {
            $this->assertNotSame('', $zone->label());
            $this->assertNotSame('', $zone->islands());
        }
    }

    public function test_it_lists_the_three_indonesian_zones_west_to_east(): void
    {
        $this->assertSame([PayerZone::Wib, PayerZone::Wita, PayerZone::Wit], PayerZone::indonesian());
    }
}
