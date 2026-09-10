<?php

namespace App\Payments\Dana\Exceptions;

use App\Payments\PaymentGatewayException;
use Throwable;

/**
 * Base for every DANA failure.
 *
 * Extends PaymentGatewayException so the existing payment flow already knows how
 * to handle it: the participant sees this message and nothing else. Anything
 * technical goes in $context, which only ever reaches the log.
 */
class DanaException extends PaymentGatewayException
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
