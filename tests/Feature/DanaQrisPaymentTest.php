<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\Dana\DanaQrisService;
use App\Payments\Dana\DanaSignature;
use App\Payments\PaymentGatewayException;
use App\Payments\PaymentGatewayManager;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\Support\PatunganFixtures;
use Tests\Support\UsesDana;
use Tests\TestCase;

class DanaQrisPaymentTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase, UsesDana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useDana();
    }

    protected function tearDown(): void
    {
        $this->tearDownDana();
        parent::tearDown();
    }

    private function openInvoice(array $names = ['Andreas']): Payment
    {
        $patungan = $this->makePatungan($this->organizer(), $names);

        return app(PaymentService::class)->createForParticipant($patungan->participants->first());
    }

    public function test_it_opens_a_qris_invoice(): void
    {
        $this->fakeDanaQrisGenerate(qrContent: '00020101021226-DANA', referenceNo: 'DANA-REF-9');

        $payment = $this->openInvoice();

        $this->assertSame('dana', $payment->gateway);
        $this->assertSame(PaymentStatus::Pending, $payment->status);
        $this->assertSame('00020101021226-DANA', $payment->qr_string);
        $this->assertSame('DANA-REF-9', $payment->gateway_transaction_id);
        $this->assertNotNull($payment->expires_at);
    }

    public function test_the_request_carries_every_header_dana_requires(): void
    {
        $this->fakeDanaQrisGenerate();

        $this->openInvoice();

        Http::assertSent(function (Request $request): bool {
            foreach (['X-TIMESTAMP', 'X-SIGNATURE', 'X-PARTNER-ID', 'X-EXTERNAL-ID', 'CHANNEL-ID'] as $header) {
                if ($request->header($header) === [] || $request->header($header)[0] === '') {
                    return false;
                }
            }

            return true;
        });
    }

    public function test_the_signature_matches_the_exact_bytes_that_were_sent(): void
    {
        $this->fakeDanaQrisGenerate();

        $this->openInvoice();

        Http::assertSent(function (Request $request): bool {
            /*
             * The single most valuable assertion in this file. If the body is
             * hashed before one encoding and transmitted as another, every live
             * call fails with a signature error that looks like bad credentials
             * and costs a day to find.
             */
            $expected = DanaSignature::transactionStringToSign(
                'POST',
                DanaQrisService::GENERATE,
                DanaSignature::hashBody($request->body()),
                $request->header('X-TIMESTAMP')[0],
            );

            return DanaSignature::verify(
                $request->header('X-SIGNATURE')[0],
                $expected,
                $this->ourDanaKeys['public'],
            );
        });
    }

    public function test_the_amount_comes_from_the_database_in_dana_format(): void
    {
        $this->fakeDanaQrisGenerate();

        $payment = $this->openInvoice();

        Http::assertSent(function (Request $request) use ($payment): bool {
            $body = json_decode($request->body(), true);

            // ISO-4217 with two decimals, and the figure is the one the invoice
            // was priced at - never anything supplied by the browser.
            return $body['amount']['value'] === number_format((int) $payment->charged_amount, 2, '.', '')
                && $body['amount']['currency'] === 'IDR'
                && $body['merchantId'] === $this->danaMerchantId
                && $body['storeId'] === 'STORE-TEST-01';
        });
    }

    public function test_a_generate_response_without_a_reference_number_is_still_usable(): void
    {
        /*
         * This is the real shape of a successful DANA QRIS generate, captured
         * from sandbox: responseCode, responseMessage and qrContent, with no
         * referenceNo anywhere. We used to demand one and threw away QRs that
         * DANA had already issued.
         */
        Http::fake([
            $this->danaBaseUrl.DanaQrisService::GENERATE => Http::response([
                'responseCode' => '2004700',
                'responseMessage' => 'Successful',
                'qrContent' => '00020101021226570011ID.DANA.WWW',
            ]),
        ]);

        $payment = $this->openInvoice();

        $this->assertSame(PaymentStatus::Pending, $payment->status);
        $this->assertSame('00020101021226570011ID.DANA.WWW', $payment->qr_string);

        // Left empty rather than invented. A notification fills it in later if
        // DANA ever sends one.
        $this->assertNull($payment->gateway_transaction_id);
    }

    public function test_a_payment_opened_without_a_reference_number_can_still_be_settled(): void
    {
        Http::fake([
            $this->danaBaseUrl.DanaQrisService::GENERATE => Http::response([
                'responseCode' => '2004700',
                'responseMessage' => 'Successful',
                'qrContent' => '00020101021226570011ID.DANA.WWW',
            ]),
        ]);

        $payment = $this->openInvoice();

        /*
         * The point of allowing the empty column: DANA matches its notification
         * on our own reference, so the money still lands on the right invoice.
         */
        $payload = $this->danaNotificationPayload(
            $payment->gateway_reference,
            (int) $payment->charged_amount,
            '00',
            'DANA-LATE-REF',
        );

        $this->postJson(
            route('webhooks.payments', ['provider' => 'dana']),
            $payload,
            $this->danaNotificationHeaders($payload),
        )->assertOk();

        $payment->refresh();

        $this->assertSame(PaymentStatus::Paid, $payment->status);
        $this->assertSame('DANA-LATE-REF', $payment->gateway_transaction_id);
    }

    public function test_it_refuses_to_generate_qris_without_the_required_store_id(): void
    {
        config(['dana.store_id' => null]);
        Http::fake();

        $this->expectException(PaymentGatewayException::class);
        $this->expectExceptionMessage('Pembayaran belum bisa dibuat');

        $this->openInvoice();
    }

    public function test_the_partner_reference_fits_dana_s_twenty_five_character_limit(): void
    {
        $this->fakeDanaQrisGenerate();

        $payment = $this->openInvoice();

        $this->assertLessThanOrEqual(25, strlen($payment->gateway_reference));
    }

    public function test_a_refusal_from_dana_is_reported_without_leaking_details(): void
    {
        Http::fake([
            $this->danaBaseUrl.DanaQrisService::GENERATE => Http::response([
                'responseCode' => '4004701',
                'responseMessage' => 'Invalid Field Format merchantId',
            ]),
        ]);

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        try {
            app(PaymentService::class)->createForParticipant($patungan->participants->first());
            $this->fail('A refused charge should not return a payment.');
        } catch (PaymentGatewayException $e) {
            // The payer sees plain Indonesian, never DANA's field-level error.
            $this->assertStringNotContainsString('merchantId', $e->getMessage());
            $this->assertStringNotContainsString('4004701', $e->getMessage());
        }
    }

    public function test_a_reply_without_qr_content_is_refused_rather_than_stored(): void
    {
        Http::fake([
            $this->danaBaseUrl.DanaQrisService::GENERATE => Http::response([
                'responseCode' => '2004700',
                'responseMessage' => 'Successful',
                'referenceNo' => 'DANA-REF-1',
                // qrContent missing: accepting this would hand the payer an
                // empty QR and a payment that can never settle.
            ]),
        ]);

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        $this->expectException(PaymentGatewayException::class);

        app(PaymentService::class)->createForParticipant($patungan->participants->first());
    }

    public function test_a_second_request_reuses_the_live_invoice_instead_of_opening_another(): void
    {
        $this->fakeDanaQrisGenerate();

        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $first = app(PaymentService::class)->createForParticipant($participant);
        $second = app(PaymentService::class)->createForParticipant($participant->refresh());

        // Two live QRs for one participant would let them pay twice.
        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Payment::query()->count());
    }

    public function test_reconciliation_settles_a_payment_dana_reports_as_paid(): void
    {
        $this->fakeDanaQrisGenerate();
        $payment = $this->openInvoice();

        Http::fake([
            $this->danaBaseUrl.DanaQrisService::QUERY => Http::response([
                'responseCode' => '2005500',
                'responseMessage' => 'Successful',
                'originalPartnerReferenceNo' => $payment->gateway_reference,
                'originalReferenceNo' => $payment->gateway_transaction_id,
                'serviceCode' => '47',
                'latestTransactionStatus' => '00',
                'amount' => ['value' => number_format((int) $payment->charged_amount, 2, '.', ''), 'currency' => 'IDR'],
            ]),
        ]);

        $event = app(PaymentGatewayManager::class)->default()->fetchStatus($payment);

        $this->assertNotNull($event);
        $this->assertSame(PaymentStatus::Paid, $event->status);
        $this->assertSame((int) $payment->charged_amount, $event->grossAmount);
    }

    public function test_a_paid_status_with_an_unreadable_amount_is_not_acted_on(): void
    {
        $this->fakeDanaQrisGenerate();
        $payment = $this->openInvoice();

        Http::fake([
            $this->danaBaseUrl.DanaQrisService::QUERY => Http::response([
                'responseCode' => '2005500',
                'responseMessage' => 'Successful',
                'latestTransactionStatus' => '00',
                // Garbage where the settled figure should be. Defaulting to the
                // invoice amount here would settle a payment on a reply we
                // could not actually read.
                'amount' => ['value' => 'not-a-number', 'currency' => 'IDR'],
            ]),
        ]);

        $this->assertNull(app(PaymentGatewayManager::class)->default()->fetchStatus($payment));
    }

    public function test_an_unpaid_order_is_reported_as_pending_not_settled(): void
    {
        $this->fakeDanaQrisGenerate();
        $payment = $this->openInvoice();

        Http::fake([
            $this->danaBaseUrl.DanaQrisService::QUERY => Http::response([
                'responseCode' => '2005500',
                'responseMessage' => 'Successful',
                // 02 "Paying" says the payment succeeded but is not final.
                // Crediting from a non-final status hands out reversible money.
                'latestTransactionStatus' => '02',
            ]),
        ]);

        $event = app(PaymentGatewayManager::class)->default()->fetchStatus($payment);

        $this->assertNotNull($event);
        $this->assertSame(PaymentStatus::Pending, $event->status);
    }
}
