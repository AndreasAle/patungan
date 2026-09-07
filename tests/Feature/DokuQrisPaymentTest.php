<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\Doku\DokuAccessToken;
use App\Payments\Doku\DokuCredentials;
use App\Payments\Doku\DokuQrisService;
use App\Payments\Doku\DokuSignature;
use App\Payments\PaymentGatewayException;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Support\PatunganFixtures;
use Tests\Support\UsesDoku;
use Tests\TestCase;

class DokuQrisPaymentTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase, UsesDoku;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useDoku();
    }

    protected function tearDown(): void
    {
        $this->tearDownDoku();
        parent::tearDown();
    }

    public function test_a_participant_gets_a_doku_qris_invoice_without_logging_in(): void
    {
        $this->fakeDokuQrisGenerate(qrContent: '00020101021226QRIS-CONTENT', referenceNo: 'DOKU-REF-9');

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        // No session, no account - just the public link.
        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]))
            ->assertRedirect();

        $payment = Payment::query()->firstOrFail();

        $this->assertSame('doku', $payment->gateway);
        $this->assertSame(PaymentStatus::Pending, $payment->status);
        $this->assertSame('DOKU-REF-9', $payment->gateway_transaction_id);
        $this->assertSame('00020101021226QRIS-CONTENT', $payment->qr_string);
        $this->assertSame(ParticipantStatus::Pending, $participant->fresh()->status);
        // The external id is kept so a call can be traced in DOKU's own logs.
        $this->assertMatchesRegularExpression('/^\d+$/', $payment->external_id);
    }

    public function test_the_charge_is_signed_and_sent_with_every_snap_header(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        app(PaymentService::class)->createForParticipant($patungan->participants->first());

        Http::assertSent(function (Request $request) {
            if (! str_ends_with($request->url(), DokuQrisService::GENERATE)) {
                return false;
            }

            foreach (['Authorization', 'X-PARTNER-ID', 'X-EXTERNAL-ID', 'X-TIMESTAMP', 'X-SIGNATURE', 'CHANNEL-ID'] as $header) {
                if (! $request->hasHeader($header)) {
                    return false;
                }
            }

            return $request->header('Authorization')[0] === 'Bearer test-access-token'
                && $request->header('X-PARTNER-ID')[0] === $this->dokuClientId;
        });
    }

    public function test_the_amount_sent_to_doku_comes_from_the_database_not_the_request(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas'], amount: 25000);
        $participant = $patungan->participants->first();

        // A hostile client tries to pay one rupiah.
        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]), [
            'amount' => 1,
            'charged_amount' => 1,
        ])->assertRedirect();

        Http::assertSent(function (Request $request) {
            if (! str_ends_with($request->url(), DokuQrisService::GENERATE)) {
                return false;
            }

            // DOKU requires the two-decimal string form of the real bill.
            return $request->data()['amount']['value'] === '25000.00';
        });

        $this->assertSame(25000, Payment::query()->firstOrFail()->charged_amount);
    }

    public function test_the_b2b_token_is_cached_across_charges(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Niko']);
        $service = app(PaymentService::class);

        foreach ($patungan->participants as $participant) {
            $service->createForParticipant($participant);
        }

        $tokenCalls = 0;
        Http::assertSent(function (Request $request) use (&$tokenCalls) {
            if (str_ends_with($request->url(), DokuAccessToken::ENDPOINT)) {
                $tokenCalls++;
            }

            return true;
        });

        // Two charges, one token.
        $this->assertSame(1, $tokenCalls);
    }

    public function test_the_token_request_is_signed_with_our_private_key(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        app(PaymentService::class)->createForParticipant($patungan->participants->first());

        Http::assertSent(function (Request $request) {
            if (! str_ends_with($request->url(), DokuAccessToken::ENDPOINT)) {
                return false;
            }

            $signature = $request->header('X-SIGNATURE')[0] ?? '';
            $timestamp = $request->header('X-TIMESTAMP')[0] ?? '';

            return DokuSignature::asymmetricMatches(
                $signature,
                $this->dokuClientId,
                $timestamp,
                $this->ourKeys['public'],
            ) && $request->data() === ['grantType' => 'client_credentials'];
        });
    }

    public function test_an_expired_token_is_refreshed_once_and_the_call_retried(): void
    {
        $tokens = ['first-token', 'second-token'];

        Http::fake([
            $this->dokuBaseUrl.DokuAccessToken::ENDPOINT => function () use (&$tokens) {
                return Http::response([
                    'responseCode' => '2007300',
                    'accessToken' => array_shift($tokens) ?? 'exhausted',
                    'expiresIn' => '900',
                ]);
            },
            $this->dokuBaseUrl.DokuQrisService::GENERATE => Http::sequence()
                // DOKU rejects the first attempt as an invalid token.
                ->push(['responseCode' => '4014701', 'responseMessage' => 'Invalid Token (B2B)'], 401)
                ->push([
                    'responseCode' => '2004700',
                    'referenceNo' => 'DOKU-REF-RETRY',
                    'qrContent' => 'QR-AFTER-RETRY',
                ], 200),
        ]);

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $this->assertSame('QR-AFTER-RETRY', $payment->qr_string);

        $generateCalls = 0;
        Http::assertSent(function (Request $request) use (&$generateCalls) {
            if (str_ends_with($request->url(), DokuQrisService::GENERATE)) {
                $generateCalls++;
            }

            return true;
        });

        // Exactly one retry - never a loop.
        $this->assertSame(2, $generateCalls);
    }

    public function test_a_refused_charge_surfaces_a_safe_message_and_leaves_no_pending_invoice(): void
    {
        Http::fake([
            $this->dokuBaseUrl.DokuAccessToken::ENDPOINT => Http::response([
                'responseCode' => '2007300', 'accessToken' => 'test-access-token', 'expiresIn' => '900',
            ]),
            $this->dokuBaseUrl.DokuQrisService::GENERATE => Http::response([
                'responseCode' => '4004701',
                'responseMessage' => 'Invalid Field Format merchantId',
            ], 400),
        ]);

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        try {
            app(PaymentService::class)->createForParticipant($participant);
            $this->fail('The charge should have been refused.');
        } catch (PaymentGatewayException $e) {
            // The participant never sees the provider's own wording.
            $this->assertStringNotContainsString('merchantId', $e->getMessage());
            $this->assertStringContainsString('coba lagi', mb_strtolower($e->getMessage()));
        }

        // The reserved invoice is released so a retry is possible.
        $this->assertSame(0, Payment::query()->where('status', PaymentStatus::Pending->value)->count());
    }

    public function test_a_participant_cannot_hold_two_active_doku_invoices(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $service = app(PaymentService::class);

        $first = $service->createForParticipant($participant);
        $second = $service->createForParticipant($participant);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Payment::query()->where('participant_id', $participant->id)->count());
    }

    public function test_a_settled_participant_cannot_open_another_invoice(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $participant->forceFill(['status' => ParticipantStatus::Paid->value])->save();

        $this->expectException(PaymentGatewayException::class);

        app(PaymentService::class)->createForParticipant($participant->fresh());
    }

    public function test_the_credentials_resolve_without_a_mall_id_so_the_token_can_be_proven_first(): void
    {
        // DOKU issues the Mall ID separately and often later. Authentication does
        // not use it, so waiting for it must not block verifying the key pair.
        config(['doku.merchant_id' => null]);

        $credentials = DokuCredentials::fromConfig(app('config'));

        $this->assertFalse($credentials->hasMerchantId());
        $this->assertSame($this->dokuClientId, $credentials->clientId);
    }

    public function test_generating_a_qr_without_a_mall_id_fails_where_it_is_actually_needed(): void
    {
        $this->fakeDokuQrisGenerate();
        config(['doku.merchant_id' => null]);

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        try {
            app(PaymentService::class)->createForParticipant($patungan->participants->first());
            $this->fail('The charge should have been refused without a Mall ID.');
        } catch (PaymentGatewayException $e) {
            // The participant still sees a safe message, never the config detail.
            $this->assertStringNotContainsString('DOKU_MERCHANT_ID', $e->getMessage());
        }

        // Nothing was sent to DOKU and no invoice was left hanging.
        Http::assertNotSent(fn (Request $request) => str_ends_with($request->url(), DokuQrisService::GENERATE));
        $this->assertSame(0, Payment::query()->where('status', PaymentStatus::Pending->value)->count());
    }

    public function test_the_provider_response_is_never_exposed_to_the_browser(): void
    {
        $this->fakeDokuQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);

        $response = $this->get(route('public.payment.show', [$patungan->public_token, $payment->uuid]));

        $response->assertOk();
        $response->assertDontSee('responseCode', escape: false);
        $response->assertDontSee($this->dokuClientSecret, escape: false);
        $response->assertDontSee($this->dokuMerchantId, escape: false);
    }
}
