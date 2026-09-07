<?php

namespace App\Payments;

use Illuminate\Http\Request;

/**
 * One inbound provider notification, with everything a signature check needs.
 *
 * Midtrans signs inside the body, but SNAP providers such as DOKU sign over the
 * method, the path and the headers as well, so a gateway cannot verify anything
 * from the payload alone.
 */
final readonly class InboundWebhook
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers  keyed by lower-case header name
     */
    public function __construct(
        public array $payload,
        public string $rawBody,
        public array $headers,
        public string $method,
        public string $path,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $payload = $request->json()->all();

        if ($payload === []) {
            $payload = $request->all();
        }

        $headers = [];
        foreach ($request->headers->all() as $name => $values) {
            $headers[strtolower($name)] = (string) ($values[0] ?? '');
        }

        return new self(
            payload: is_array($payload) ? $payload : [],
            rawBody: $request->getContent(),
            headers: $headers,
            method: strtoupper($request->getMethod()),
            // The signed path is the notification URL's path, query string excluded.
            path: '/'.ltrim($request->getPathInfo(), '/'),
        );
    }

    public function header(string $name): ?string
    {
        $value = $this->headers[strtolower($name)] ?? null;

        return $value === '' ? null : $value;
    }

    /** Convenience for tests and for gateways that only care about the body. */
    public static function fake(array $payload, array $headers = [], string $path = '/webhooks/payments/test'): self
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $normalised = [];
        foreach ($headers as $name => $value) {
            $normalised[strtolower($name)] = (string) $value;
        }

        return new self($payload, $body === false ? '' : $body, $normalised, 'POST', $path);
    }
}
