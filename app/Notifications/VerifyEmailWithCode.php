<?php

namespace App\Notifications;

use App\Services\EmailVerificationCode;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Symfony\Component\Mime\Email;

/** Delivers the six digit code, on our own branded template. */
class VerifyEmailWithCode extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = [
            'code' => $this->code,
            'name' => $notifiable->name,
            'minutes' => EmailVerificationCode::TTL_MINUTES,
        ];

        return (new MailMessage)
            ->subject('Kode verifikasi Patungan: '.$this->code)
            /*
             * Both parts, not just the HTML one. Mail with no plain-text
             * alternative scores worse with spam filters, and a verification
             * code that lands in Spam is a signup that never finishes.
             */
            ->view(['emails.verify-code', 'emails.verify-code-text'], $data)
            ->withSymfonyMessage(function (Email $message): void {
                $headers = $message->getHeaders();

                // Marks this as machine-generated so autoresponders stay quiet
                // and filters read it as transactional rather than bulk.
                $headers->addTextHeader('Auto-Submitted', 'auto-generated');
                $headers->addTextHeader('X-Auto-Response-Suppress', 'All');
            });
    }
}
