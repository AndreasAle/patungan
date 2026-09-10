<?php

namespace App\Payments\Dana\Exceptions;

/** A request could not be signed - almost always an unreadable private key. */
class DanaSignatureException extends DanaException {}
