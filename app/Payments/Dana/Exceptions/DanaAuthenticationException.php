<?php

namespace App\Payments\Dana\Exceptions;

/** Credentials are missing, unreadable, or contradict each other. */
class DanaAuthenticationException extends DanaException {}
