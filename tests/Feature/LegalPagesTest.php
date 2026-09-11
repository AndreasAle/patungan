<?php

namespace Tests\Feature;

use App\Services\FeeCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The legal pages have to be reachable by anyone, and the terms have to quote
 * the fee the application really charges.
 *
 * That second point is the reason this file exists. A percentage typed into the
 * page by hand would drift the first time the fee configuration changed, and
 * nobody would notice until a payer compared this page with their receipt.
 */
class LegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_both_pages_open_without_an_account(): void
    {
        $this->get(route('legal.privacy'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('legal/privacy'));

        $this->get(route('legal.terms'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('legal/terms'));
    }

    public function test_the_terms_quote_the_live_fee_calculation(): void
    {
        $expected = app(FeeCalculator::class)->for(25_000);

        $this->get(route('legal.terms'))
            ->assertInertia(fn ($page) => $page
                ->where('fee.example_amount', $expected->amount)
                ->where('fee.example_charged', $expected->chargedAmount)
                ->where('fee.service_fee', $expected->serviceFee));
    }

    public function test_the_terms_quote_the_configured_payout_minimum(): void
    {
        config(['patungan.payout.min_amount' => 25_000]);

        $this->get(route('legal.terms'))
            ->assertInertia(fn ($page) => $page->where('payout.minimum', 25_000));
    }

    public function test_the_terms_quote_the_configured_invoice_window(): void
    {
        config(['patungan.invoice_ttl' => 1_800]);

        $this->get(route('legal.terms'))
            ->assertInertia(fn ($page) => $page->where('invoice_minutes', 30));
    }

    public function test_both_pages_carry_a_last_updated_date(): void
    {
        // A policy with no date tells a reader nothing about whether what they
        // agreed to is still what is written.
        foreach (['legal.privacy', 'legal.terms'] as $route) {
            $this->get(route($route))->assertInertia(fn ($page) => $page->whereNot('updated', ''));
        }
    }

    public function test_the_front_end_can_link_to_them(): void
    {
        /*
         * The footers are rendered by React, so the links are not in the
         * initial HTML - what has to be there is the named route, published by
         * Ziggy. Without it route('legal.privacy') throws in the browser and
         * the footer takes the whole page down with it.
         */
        $content = $this->get(route('home'))->getContent();

        $this->assertStringContainsString('legal.privacy', $content);
        $this->assertStringContainsString('legal.terms', $content);
    }
}
