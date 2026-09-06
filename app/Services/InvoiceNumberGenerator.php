<?php

namespace App\Services;

use App\Models\PatunganParticipant;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Issues the human-facing reference printed on a receipt.
 *
 * It deliberately replaces the gateway transaction id in anything a payer can
 * see, so an invoice can be shared without leaking provider internals.
 */
class InvoiceNumberGenerator
{
    public function generate(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $number = 'INV-'.now()->format('ymd').'-'.strtoupper(Str::random(5));

            if (! PatunganParticipant::query()->where('invoice_number', $number)->exists()) {
                return $number;
            }
        }

        throw new RuntimeException('Could not allocate a unique invoice number.');
    }
}
