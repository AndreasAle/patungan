<?php

namespace Tests\Feature;

use App\Models\User;
use App\Otp\LogOtpSender;
use App\Services\PhoneVerificationCode;
use App\Support\PhoneNumber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\Support\RecordingOtpSender;
use Tests\TestCase;

/**
 * Proving an organizer owns a phone number.
 *
 * This is not account decoration. PayoutRiskPolicy holds automatic payouts
 * until it passes, because a warning about a new payout account has to arrive
 * somewhere an attacker sitting in the email cannot reach.
 */
class PhoneVerificationTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    private RecordingOtpSender $sender;

    protected function setUp(): void
    {
        parent::setUp();

        config(['patungan.otp.driver' => 'log']);

        // Stands in for the driver the manager would resolve, so the code can
        // be read the way somebody reads it off their phone.
        $this->sender = new RecordingOtpSender;
        $this->app->bind(LogOtpSender::class, fn () => $this->sender);
    }

    private function codes(): PhoneVerificationCode
    {
        return app(PhoneVerificationCode::class);
    }

    public function test_the_same_number_written_six_ways_is_one_number(): void
    {
        foreach (['081234567890', '6281234567890', '+62 812-3456-7890', '0812 3456 7890'] as $written) {
            $this->assertSame('+6281234567890', PhoneNumber::normalise($written), $written.' should normalise');
        }
    }

    public function test_something_that_is_not_a_mobile_number_is_refused(): void
    {
        // A landline would take a code that never arrives.
        $this->assertNull(PhoneNumber::normalise('0217654321'));
        $this->assertNull(PhoneNumber::normalise('08123'));
        $this->assertNull(PhoneNumber::normalise(''));
    }

    public function test_a_code_verifies_the_number(): void
    {
        $user = $this->organizer();

        $this->assertTrue($this->codes()->send($user, '0812 3456 7890')['ok']);

        $user->refresh();
        $this->assertSame('+6281234567890', $user->phone);
        $this->assertNull($user->phone_verified_at, 'Entering a number is not owning it.');

        // Read the way the person reads it off their phone.
        $code = $this->codeFor($user);

        $this->assertTrue($this->codes()->confirm($user, $code)['ok']);
        $this->assertNotNull($user->refresh()->phone_verified_at);
    }

    public function test_a_wrong_code_is_counted_and_eventually_locked_out(): void
    {
        $user = $this->organizer();
        $this->codes()->send($user, '081234567890');

        for ($i = 0; $i < PhoneVerificationCode::MAX_ATTEMPTS; $i++) {
            $this->assertFalse($this->codes()->confirm($user->refresh(), '000000')['ok']);
        }

        // Six digits is a small space; guessing has to stop being free.
        $result = $this->codes()->confirm($user->refresh(), '000000');
        $this->assertStringContainsString('terlalu banyak percobaan', $result['message']);
    }

    public function test_changing_the_number_drops_the_old_verification(): void
    {
        $user = $this->organizer();
        $this->codes()->send($user, '081234567890');
        $this->codes()->confirm($user->refresh(), $this->codeFor($user->refresh()));

        $this->assertNotNull($user->refresh()->phone_verified_at);

        /*
         * The hole this closes: a number verified last month must not vouch for
         * a number typed today. Otherwise somebody who takes over an account
         * swaps in their own number and inherits the verified badge - and with
         * it, automatic payouts.
         */
        $user->forceFill(['phone_verification_sent_at' => now()->subMinutes(5)])->save();
        $this->codes()->send($user->refresh(), '089999888877');

        $this->assertNull($user->refresh()->phone_verified_at);
    }

    public function test_a_resend_is_not_free(): void
    {
        $user = $this->organizer();
        $this->codes()->send($user, '081234567890');

        $result = $this->codes()->send($user->refresh(), '081234567890');

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('Tunggu', $result['message']);
    }

    public function test_nothing_can_be_verified_without_a_real_provider(): void
    {
        config(['patungan.otp.driver' => 'none']);

        $user = $this->organizer();
        $result = $this->codes()->send($user, '081234567890');

        /*
         * The safe resting state. No provider means no verified phones, which
         * means PayoutRiskPolicy keeps every payout queued for an operator
         * rather than releasing money on a protection that does not exist.
         */
        $this->assertFalse($result['ok']);
        $this->assertFalse($this->codes()->isAvailable());
        $this->assertNull($user->refresh()->phone_verified_at);
    }

    public function test_the_log_driver_refuses_to_run_in_production(): void
    {
        // The real driver, not the stand-in - this is a property of that class.
        $this->app->forgetInstance(LogOtpSender::class);
        $this->app->bind(LogOtpSender::class, fn ($app) => new LogOtpSender($app));
        $this->app->detectEnvironment(fn () => 'production');

        $this->assertFalse($this->codes()->isAvailable(), 'A pretend sender in production would mint hollow verifications.');
    }

    public function test_the_endpoint_verifies_an_organizers_own_number(): void
    {
        $user = $this->organizer();

        $this->actingAs($user)
            ->post(route('phone.verify.send'), ['phone' => '081234567890'])
            ->assertRedirect();

        $this->actingAs($user)
            ->post(route('phone.verify.confirm'), ['code' => $this->codeFor($user->refresh())])
            ->assertRedirect();

        $this->assertNotNull($user->refresh()->phone_verified_at);
    }

    public function test_phone_verification_requires_signing_in(): void
    {
        $this->post(route('phone.verify.send'), ['phone' => '081234567890'])->assertRedirect(route('login'));
    }

    private function codeFor(User $user): string
    {
        return $this->sender->lastCode() ?? $this->fail('No code was sent.');
    }
}
