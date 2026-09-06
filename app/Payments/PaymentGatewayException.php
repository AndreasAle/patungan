<?php

namespace App\Payments;

use RuntimeException;

/** Raised when a provider refuses or cannot serve a charge request. */
class PaymentGatewayException extends RuntimeException {}
