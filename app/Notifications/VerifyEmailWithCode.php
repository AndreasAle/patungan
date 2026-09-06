<?php

namespace App\Notifications;

use App\Services\EmailVerificationCode;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

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
        return (new MailMessage)
            ->subject('Kode verifikasi Patungan: '.$this->code)
            ->view('emails.verify-code', [
                'code' => $this->code,
                'name' => $notifiable->name,
                'minutes' => EmailVerificationCode::TTL_MINUTES,
            ]);
    }
}
