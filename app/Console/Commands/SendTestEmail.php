<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/** Confirms the SMTP credentials actually work, before a real user depends on them. */
class SendTestEmail extends Command
{
    protected $signature = 'mail:test {email : Where to send the test message}';

    protected $description = 'Send a test email to check the mail configuration';

    public function handle(): int
    {
        $recipient = $this->argument('email');

        $this->line('Mailer   : '.config('mail.default'));
        $this->line('Host     : '.config('mail.mailers.smtp.host').':'.config('mail.mailers.smtp.port'));
        $this->line('From     : '.config('mail.from.address'));

        if (config('mail.default') === 'smtp' && blank(config('mail.mailers.smtp.password'))) {
            $this->error('MAIL_PASSWORD is empty. Fill it in .env first.');

            return self::FAILURE;
        }

        try {
            Mail::raw(
                "Halo!\n\nIni email percobaan dari Patungan. Kalau kamu menerima ini, pengaturan email sudah benar.",
                fn ($message) => $message->to($recipient)->subject('Tes email Patungan'),
            );
        } catch (Throwable $e) {
            $this->error('Failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Sent to {$recipient}.");

        return self::SUCCESS;
    }
}
