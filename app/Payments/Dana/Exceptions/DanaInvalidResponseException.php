<?php

namespace App\Payments\Dana\Exceptions;

/**
 * DANA accepted the request but the reply is missing something we must have.
 *
 * Separate from a refusal on purpose: a refusal is DANA working correctly and
 * saying no, while this is a reply we cannot safely act on.
 */
class DanaInvalidResponseException extends DanaException {}
