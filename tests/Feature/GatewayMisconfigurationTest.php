<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Payments\PaymentGatewayException;
use App\Payments\PaymentGatewayManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * A gateway that cannot be built is still a payment that cannot be made. The
 * participant has to be told that in words, not shown a 500.
 */
class GatewayMisconfigurationTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_an_unknown_driver_is_reported_as_a_payment_failure(): void
    {
        config(['patungan.gateway' => 'does-not-exist']);

        $this->expectException(PaymentGatewayException::class);

        app(PaymentGatewayManager::class)->default();
    }

    public function test_the_real_reason_is_kept_for_the_log_and_hidden_from_the_payer(): void
    {
        config(['patungan.gateway' => 'does-not-exist']);

        try {
            app(PaymentGatewayManager::class)->default();
            $this->fail('The manager should have refused.');
        } catch (PaymentGatewayException $e) {
            $this->assertStringNotContainsString('does-not-exist', $e->getMessage());
            // The cause still travels, so the log keeps the detail.
            $this->assertStringContainsString('does-not-exist', (string) $e->getPrevious()?->getMessage());
        }
    }

    public function test_a_misconfigured_gateway_shows_the_payer_a_message_not_a_server_error(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        config(['patungan.gateway' => 'does-not-exist']);

        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]))
            ->assertRedirect()
            ->assertSessionHas('error');

        // Nothing half-created was left behind.
        $this->assertSame(0, Payment::query()->count());
    }
}
