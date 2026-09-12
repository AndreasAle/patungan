<?php

namespace Tests\Support;

use App\Contracts\OtpSender;

/**
 * Captures what would have been texted, so a test can read the code the way
 * the person reads it off their phone - rather than reaching into the hashed
 * column, which would mean weakening the storage to make it testable.
 */
class RecordingOtpSender implements OtpSender
{
    /** @var list<array{phone: string, message: string}> */
    public array $sent = [];

    public function __construct(public bool $available = true) {}

    public function name(): string
    {
        return 'recording';
    }

    public function isAvailable(): bool
    {
        return $this->available;
    }

    public function send(string $phone, string $message): bool
    {
        if (! $this->available) {
            return false;
        }

        $this->sent[] = ['phone' => $phone, 'message' => $message];

        return true;
    }

    /** The six digits out of the most recent message. */
    public function lastCode(): ?string
    {
        $last = end($this->sent);

        if ($last === false) {
            return null;
        }

        preg_match('/\b(\d{6})\b/', $last['message'], $matches);

        return $matches[1] ?? null;
    }
}
