<?php

namespace Tests\Unit;

use App\Payments\Doku\DokuSignature;
use PHPUnit\Framework\TestCase;
use Tests\Support\GeneratesRsaKeys;

class DokuSignatureTest extends TestCase
{
    use GeneratesRsaKeys;

    public function test_minify_drops_whitespace_between_tokens(): void
    {
        $pretty = "{\n    \"partnerReferenceNo\": \"PTG-1\",\n    \"amount\": {\n        \"value\": \"25500.00\"\n    }\n}";

        $this->assertSame('{"partnerReferenceNo":"PTG-1","amount":{"value":"25500.00"}}', DokuSignature::minify($pretty));
    }

    public function test_minify_keeps_whitespace_inside_strings(): void
    {
        $body = '{"name": "Badminton  Minggu Malam"}';

        // Squeezing the value would change the hash and break the signature.
        $this->assertSame('{"name":"Badminton  Minggu Malam"}', DokuSignature::minify($body));
    }

    public function test_minify_is_not_confused_by_an_escaped_quote(): void
    {
        $body = '{"note": "dia bilang \" oke \" lalu pergi", "x": 1}';

        $this->assertSame('{"note":"dia bilang \" oke \" lalu pergi","x":1}', DokuSignature::minify($body));
    }

    public function test_the_body_hash_is_lowercase_sha256_hex_of_the_minified_body(): void
    {
        $body = '{ "a" : 1 }';

        $expected = strtolower(hash('sha256', '{"a":1}'));

        $this->assertSame($expected, DokuSignature::hashBody($body));
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', DokuSignature::hashBody($body));
    }

    public function test_pretty_and_minified_bodies_hash_identically(): void
    {
        $this->assertSame(
            DokuSignature::hashBody('{"a":1,"b":{"c":2}}'),
            DokuSignature::hashBody("{\n  \"a\": 1,\n  \"b\": { \"c\": 2 }\n}"),
        );
    }

    public function test_the_transaction_string_to_sign_follows_the_documented_shape(): void
    {
        $stringToSign = DokuSignature::transactionStringToSign(
            'post',
            '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate',
            'token-123',
            'abc123',
            '2026-09-07T14:18:39+07:00',
        );

        $this->assertSame(
            'POST:/snap-adapter/b2b/v1.0/qr/qr-mpm-generate:token-123:abc123:2026-09-07T14:18:39+07:00',
            $stringToSign,
        );
    }

    public function test_the_symmetric_signature_is_deterministic_base64_hmac_sha512(): void
    {
        $stringToSign = 'POST:/x:token:hash:2026-09-07T14:18:39+07:00';
        $secret = 'SK-secret';

        $signature = DokuSignature::symmetric($stringToSign, $secret);

        $this->assertSame(base64_encode(hash_hmac('sha512', $stringToSign, $secret, true)), $signature);
        // Same inputs must always produce the same signature.
        $this->assertSame($signature, DokuSignature::symmetric($stringToSign, $secret));
        $this->assertTrue(DokuSignature::symmetricMatches($signature, $stringToSign, $secret));
    }

    public function test_the_symmetric_signature_changes_when_any_component_changes(): void
    {
        $secret = 'SK-secret';
        $base = DokuSignature::symmetric('POST:/x:token:hash:ts', $secret);

        $this->assertNotSame($base, DokuSignature::symmetric('GET:/x:token:hash:ts', $secret));
        $this->assertNotSame($base, DokuSignature::symmetric('POST:/y:token:hash:ts', $secret));
        $this->assertNotSame($base, DokuSignature::symmetric('POST:/x:other:hash:ts', $secret));
        $this->assertNotSame($base, DokuSignature::symmetric('POST:/x:token:other:ts', $secret));
        $this->assertNotSame($base, DokuSignature::symmetric('POST:/x:token:hash:ts2', $secret));
        // A different secret must not validate.
        $this->assertFalse(DokuSignature::symmetricMatches($base, 'POST:/x:token:hash:ts', 'other-secret'));
    }

    public function test_the_asymmetric_signature_round_trips_and_rejects_tampering(): void
    {
        ['private' => $private, 'public' => $public] = $this->rsaKeyPair();

        $signature = DokuSignature::asymmetric('CLIENT-1', '2026-09-07T14:18:39+07:00', $private);

        $this->assertTrue(DokuSignature::asymmetricMatches($signature, 'CLIENT-1', '2026-09-07T14:18:39+07:00', $public));
        // A different client or timestamp must not verify against the same signature.
        $this->assertFalse(DokuSignature::asymmetricMatches($signature, 'CLIENT-2', '2026-09-07T14:18:39+07:00', $public));
        $this->assertFalse(DokuSignature::asymmetricMatches($signature, 'CLIENT-1', '2026-09-07T14:18:40+07:00', $public));
    }

    public function test_a_signature_from_another_key_is_refused(): void
    {
        $mine = $this->rsaKeyPair();
        $theirs = $this->rsaKeyPair();

        $forged = DokuSignature::asymmetric('CLIENT-1', 'ts', $theirs['private']);

        $this->assertFalse(DokuSignature::asymmetricMatches($forged, 'CLIENT-1', 'ts', $mine['public']));
    }

    public function test_the_timestamp_is_iso8601_with_an_offset(): void
    {
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/',
            DokuSignature::timestamp(new \DateTimeImmutable('2026-09-07 14:18:39')),
        );
    }
}
