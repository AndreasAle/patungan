<?php

namespace Tests\Unit;

use App\Payments\Dana\DanaSignature;
use App\Payments\Dana\Exceptions\DanaSignatureException;
use PHPUnit\Framework\TestCase;
use Tests\Support\GeneratesRsaKeys;

/**
 * The signature is the whole security model for DANA notifications: the
 * endpoint is public, and this is the only thing separating a real settlement
 * from a forged one. These assertions are written against the worked examples
 * in DANA's own authentication reference.
 */
class DanaSignatureTest extends TestCase
{
    use GeneratesRsaKeys;

    /** The exact example from DANA's documentation. */
    private const DOC_BODY = '{"partnerReferenceNo":"2020102900000000000001","balanceTypes":["BALANCE"],"additionalInfo":{"accessToken":"fa8sjjEj813Y9JGoqwOeOPWbnt4CUpvIJbU1mMU4a11MNDZ7Sg5u9a"}}';

    private const DOC_HASH = 'e9295c3253c05560273ff305d9eea6abf77fff65229bf90b1781383c09c29d98';

    public function test_it_reproduces_the_body_hash_from_the_documentation(): void
    {
        $this->assertSame(self::DOC_HASH, DanaSignature::hashBody(self::DOC_BODY));
    }

    public function test_minifying_does_not_change_the_hash(): void
    {
        $pretty = <<<'JSON'
        {
          "partnerReferenceNo": "2020102900000000000001",
          "balanceTypes": ["BALANCE"],
          "additionalInfo": {
            "accessToken" : "fa8sjjEj813Y9JGoqwOeOPWbnt4CUpvIJbU1mMU4a11MNDZ7Sg5u9a"
          }
        }
        JSON;

        // DANA hashes the minified body, so the same payload sent pretty or
        // compact must produce the same signature.
        $this->assertSame(self::DOC_HASH, DanaSignature::hashBody($pretty));
    }

    public function test_it_does_not_strip_whitespace_inside_string_values(): void
    {
        // A participant called "Budi  Santoso" must not be silently rewritten
        // by the minifier - that would change the bytes DANA hashes.
        $withSpaces = '{"name":"Budi  Santoso"}';

        $this->assertSame(
            strtolower(hash('sha256', $withSpaces)),
            DanaSignature::hashBody($withSpaces),
        );
    }

    public function test_it_builds_the_transaction_string_exactly_as_documented(): void
    {
        $this->assertSame(
            'POST:/v1.0/balance-inquiry.htm:'.self::DOC_HASH.':2022-11-30T09:45:35+07:00',
            DanaSignature::transactionStringToSign(
                'post',
                '/v1.0/balance-inquiry.htm',
                self::DOC_HASH,
                '2022-11-30T09:45:35+07:00',
            ),
        );
    }

    public function test_it_builds_the_token_string_exactly_as_documented(): void
    {
        $this->assertSame(
            '82150823919040624621823174737537|2020-12-18T15:06:00+07:00',
            DanaSignature::tokenStringToSign('82150823919040624621823174737537', '2020-12-18T15:06:00+07:00'),
        );
    }

    public function test_a_signature_verifies_against_its_own_public_key(): void
    {
        [$private, $public] = $this->keyPair();

        $stringToSign = DanaSignature::transactionStringToSign('POST', '/v1.0/debit/notify', self::DOC_HASH, '2026-09-10T09:45:35+07:00');
        $signature = DanaSignature::sign($stringToSign, $private);

        $this->assertTrue(DanaSignature::verify($signature, $stringToSign, $public));
    }

    public function test_a_tampered_body_breaks_the_signature(): void
    {
        [$private, $public] = $this->keyPair();

        $timestamp = '2026-09-10T09:45:35+07:00';
        $honest = DanaSignature::transactionStringToSign('POST', '/v1.0/debit/notify', DanaSignature::hashBody('{"amount":"10000.00"}'), $timestamp);
        $signature = DanaSignature::sign($honest, $private);

        // The attack this exists to stop: replay a real notification with the
        // amount changed.
        $tampered = DanaSignature::transactionStringToSign('POST', '/v1.0/debit/notify', DanaSignature::hashBody('{"amount":"9999999.00"}'), $timestamp);

        $this->assertFalse(DanaSignature::verify($signature, $tampered, $public));
    }

    public function test_a_signature_from_a_different_key_is_refused(): void
    {
        [$private] = $this->keyPair();
        [, $otherPublic] = $this->keyPair();

        $stringToSign = DanaSignature::transactionStringToSign('POST', '/v1.0/debit/notify', self::DOC_HASH, '2026-09-10T09:45:35+07:00');

        $this->assertFalse(DanaSignature::verify(DanaSignature::sign($stringToSign, $private), $stringToSign, $otherPublic));
    }

    public function test_malformed_signatures_are_refused_rather_than_throwing(): void
    {
        [, $public] = $this->keyPair();

        foreach (['', 'not-base64!!', base64_encode('too short')] as $candidate) {
            $this->assertFalse(DanaSignature::verify($candidate, 'anything', $public));
        }
    }

    public function test_an_unreadable_private_key_is_reported_not_ignored(): void
    {
        $this->expectException(DanaSignatureException::class);

        DanaSignature::sign('anything', 'not a pem file');
    }

    public function test_the_timestamp_carries_an_offset(): void
    {
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/',
            DanaSignature::timestamp(new \DateTimeImmutable('2026-09-10 09:45:35')),
        );
    }

    /** @return array{0: string, 1: string} private PEM, public PEM */
    private function keyPair(): array
    {
        $pair = $this->rsaKeyPair();

        return [$pair['private'], $pair['public']];
    }
}
