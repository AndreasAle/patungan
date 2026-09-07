<?php

namespace App\Payments\Doku\Exceptions;

use App\Payments\PaymentGatewayException;
use Throwable;

/**
 * Base for every DOKU failure.
 *
 * The message is what the participant sees, so it stays plain Indonesian and
 * never carries a provider response. Anything technical goes in $context, which
 * only reaches the log.
 */
class DokuException extends PaymentGatewayException
{
    /** @var array<string, mixed> */
    public readonly array $context;

    /** @param array<string, mixed> $context */
    public function __construct(
        string $message = 'Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.',
        array $context = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);

        $this->context = $context;
    }
}
