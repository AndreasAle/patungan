<?php

namespace App\Http\Controllers;

use App\Services\FeeCalculator;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The privacy policy and the terms.
 *
 * Both are public, both are needed before an app store or a payment provider's
 * business verification will take the product seriously, and both are rendered
 * rather than hardcoded in the front end for one reason: the terms quote real
 * fee figures, and those come from the same calculator that prices a real
 * invoice. A percentage typed into a React component would drift from what
 * payers are actually charged, and nobody would notice until somebody compared
 * this page with their receipt.
 */
class LegalController extends Controller
{
    /**
     * Bumped by hand when the wording changes.
     *
     * Not the file's modification time and not today's date: a policy that
     * claims to have been updated whenever the server restarted tells a reader
     * nothing, and "last updated" is the one date on these pages people
     * actually rely on.
     */
    private const UPDATED = '11 September 2026';

    public function privacy(): Response
    {
        return Inertia::render('legal/privacy', ['updated' => self::UPDATED]);
    }

    public function terms(FeeCalculator $fees): Response
    {
        // A round, ordinary bill, priced by the live calculator.
        $example = $fees->for(25_000);

        return Inertia::render('legal/terms', [
            'updated' => self::UPDATED,
            'fee' => [
                'service_fee' => $example->serviceFee,
                'example_amount' => $example->amount,
                'example_charged' => $example->chargedAmount,
            ],
            'payout' => [
                'minimum' => (int) config('patungan.payout.min_amount', 10_000),
            ],
            'invoice_minutes' => (int) round(((int) config('patungan.invoice_ttl')) / 60),
        ]);
    }
}
