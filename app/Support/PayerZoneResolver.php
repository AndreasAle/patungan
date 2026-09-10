<?php

namespace App\Support;

use App\Enums\PayerZone;

/**
 * Turns a browser-reported IANA timezone into a payer zone.
 *
 * The input arrives from the payer's own device and is therefore untrusted:
 * it can be absent, misspelled, spoofed, or 400 characters of junk. Every path
 * through here ends in either a valid enum case or null - never an exception,
 * because a payment must not fail over a piece of analytics.
 */
class PayerZoneResolver
{
    /** Longer than any real identifier ("America/Argentina/ComodRivadavia" is 31). */
    private const MAX_LENGTH = 64;

    public function fromTimezone(?string $timezone): ?PayerZone
    {
        if ($timezone === null) {
            return null;
        }

        $normalised = strtolower(trim($timezone));

        if ($normalised === '' || strlen($normalised) > self::MAX_LENGTH) {
            return null;
        }

        $zone = PayerZone::timezoneMap()[$normalised] ?? null;

        if ($zone !== null) {
            return $zone;
        }

        /*
         * Anything else that is a plausible identifier counts as overseas. The
         * shape check matters: without it a browser sending "" or "unknown"
         * would be recorded as a genuine foreign payer and quietly inflate that
         * slice of the chart.
         */
        return $this->looksLikeIdentifier($normalised) ? PayerZone::Overseas : null;
    }

    private function looksLikeIdentifier(string $value): bool
    {
        return preg_match('/^[a-z]+(?:[\/_+-][a-z0-9]+)+$/i', $value) === 1
            || preg_match('/^(?:utc|gmt)(?:[+-]\d{1,2}(?::\d{2})?)?$/i', $value) === 1;
    }
}
