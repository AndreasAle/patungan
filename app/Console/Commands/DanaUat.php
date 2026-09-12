<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\Dana\DanaCredentials;
use App\Payments\Dana\DanaExternalIdGenerator;
use App\Payments\Dana\DanaGateway;
use App\Payments\Dana\DanaQrisService;
use App\Payments\Dana\Exceptions\DanaException;
use App\Payments\PaymentGatewayManager;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Throwable;

/**
 * Drives the three QRIS calls DANA's integration checklist wants to see.
 *
 * DANA marks a scenario complete when it observes the call arrive from a
 * merchant's sandbox credentials; their own automated UAT suite covers Payment
 * Gateway, Widget and Disbursement but not QRIS, so the QRIS scenarios have to
 * be driven from the integration itself. That is what this does - the same
 * driver that will take real payments, pointed at sandbox.
 *
 * Nothing is written to the database. The Payment handed to query and cancel is
 * an unsaved model carrying only the three fields those calls read, so a run
 * cannot leave a stray invoice behind or disturb anybody's ledger.
 */
class DanaUat extends Command
{
    protected $signature = 'dana:uat
        {--amount=10000 : Amount in whole rupiah for the test charge}
        {--keep : Skip the cancel step, leaving the QR payable in sandbox}
        {--dump : Print the full request and response, for a provider support ticket}
        {--minimal : Send the exact body shape DANA support hands out, to isolate a field}
        {--no-validity : Drop validityPeriod only, leaving the rest of the full body}
        {--terminal= : Override orderTerminalType (APP or WEB), to isolate that field}';

    protected $description = 'Run the DANA QRIS sandbox scenarios: generate, query, cancel';

    public function handle(PaymentGatewayManager $gateways): int
    {
        try {
            $credentials = DanaCredentials::fromConfig(config());
        } catch (DanaException $e) {
            $this->components->error('DANA is not configured: '.($e->context['reason'] ?? 'unknown'));
            $this->line('  <fg=gray>Run php artisan dana:doctor for the full picture.</>');

            return self::FAILURE;
        }

        /*
         * Refused against production, and not as a nicety. These calls open a
         * real QR and then cancel it; against live credentials that is money
         * infrastructure being exercised by a diagnostic command.
         */
        if ($credentials->production) {
            $this->components->error('dana:uat only runs against sandbox. DANA_ENV is currently production.');

            return self::FAILURE;
        }

        $amount = max(1, (int) $this->option('amount'));
        $reference = 'UAT-'.now()->format('ymd').'-'.strtoupper(Str::random(8));

        $this->line('');
        $this->components->twoColumnDetail('Environment', 'sandbox');
        $this->components->twoColumnDetail('Base URL', $credentials->baseUrl);
        $this->components->twoColumnDetail('Reference', $reference);
        $this->components->twoColumnDetail('Amount', 'Rp'.number_format($amount, 0, ',', '.'));
        $this->line('');

        $qris = $this->qrisService($gateways);

        if ($qris === null) {
            return self::FAILURE;
        }

        if ($this->option('no-validity')) {
            $qris->withoutValidityPeriod();
            $this->components->warn('validityPeriod dropped; the QR will use the DANA default lifetime.');
        }

        if (is_string($terminal = $this->option('terminal')) && $terminal !== '') {
            $qris->withOrderTerminalType(strtoupper($terminal));
            $this->components->warn('orderTerminalType forced to '.strtoupper($terminal).'.');
        }

        if ($this->option('minimal')) {
            $qris->useMinimalBody();
            $this->components->warn('Minimal body: no validityPeriod, no sourcePlatform, orderTerminalType APP.');
        }

        $ids = new DanaExternalIdGenerator;

        // --- Scenario 1: Generate QRIS --------------------------------------
        try {
            $charge = $qris->generate(
                new ChargeRequest(
                    reference: $reference,
                    amount: $amount,
                    description: 'Patungan UAT',
                    participantName: 'UAT Tester',
                    patunganTitle: 'Patungan UAT',
                    expirySeconds: 900,
                ),
                $ids->generate(),
            );
        } catch (Throwable $e) {
            $this->reportFailure('Generate QRIS', $e);
            $this->dump($qris);

            return self::FAILURE;
        }

        $this->dump($qris);

        // DANA's generate does not return a referenceNo; say so plainly rather
        // than printing "referenceNo " with nothing after it.
        $this->pass('Generate QRIS', $charge->transactionId === null
            ? 'accepted, no referenceNo returned'
            : 'referenceNo '.$charge->transactionId);
        $this->line('  <fg=gray>QR content: '.Str::limit($charge->qrString ?? '', 48).'</>');

        /*
         * An unsaved stand-in. query() and cancel() read only these three
         * fields, and keeping it out of the database means a UAT run leaves no
         * trace in anybody's invoice history.
         */
        $payment = new Payment;
        $payment->forceFill([
            'gateway_reference' => $reference,
            'gateway_transaction_id' => $charge->transactionId,
            'charged_amount' => $amount,
        ]);

        // --- Scenario 2: Query Payment --------------------------------------
        $event = $qris->query($payment, $ids->generate());

        if ($event === null) {
            // Dump before bailing: the query exchange is the whole evidence and
            // --dump used to show only the generate that had already passed.
            $this->dump($qris);
            $this->reportFailure('Query Payment', new \RuntimeException('DANA did not return a readable status.'));

            return self::FAILURE;
        }

        $this->pass('Query Payment', $event->eventType === 'qris.query.not_found'
            // Expected: the QR was created seconds ago and nobody has scanned
            // it, so DANA has no transaction to report yet.
            ? 'belum ada yang bayar (Transaction Not Found)'
            : 'status '.$event->status->value);

        // --- Scenario 3: Cancel Order ---------------------------------------
        if ($this->option('keep')) {
            $this->components->warn('Cancel skipped (--keep). The sandbox QR stays payable.');

            return self::SUCCESS;
        }

        if (! $qris->cancel($payment, $ids->generate(), 'UAT scenario')) {
            $this->dump($qris);
            $this->reportFailure('Cancel Order', new \RuntimeException('DANA refused the cancel.'));

            return self::FAILURE;
        }

        $this->pass('Cancel Order', 'accepted');

        $this->line('');
        $this->components->info('All three QRIS calls reached DANA.');
        $this->line('  <fg=gray>Refresh the Integration Checklist; scenarios are ticked on DANA\'s side,</>');
        $this->line('  <fg=gray>not here. If one still shows incomplete, '.$this->logPath().'</>');
        $this->line('  <fg=gray>has the exact request and response code they saw.</>');

        return self::SUCCESS;
    }

    private function qrisService(PaymentGatewayManager $gateways): ?DanaQrisService
    {
        try {
            // Built through the manager so this exercises the same wiring the
            // payment flow uses, rather than a hand-assembled copy of it.
            $gateway = $gateways->driver('dana');
        } catch (Throwable $e) {
            $this->components->error('The DANA driver could not be built: '.$e->getMessage());

            return null;
        }

        if (! $gateway instanceof DanaGateway) {
            $this->components->error('PAYMENT_GATEWAY did not resolve to the DANA driver.');

            return null;
        }

        return $gateway->qris();
    }

    /**
     * Prints the exchange verbatim when --dump is given.
     *
     * Safe to paste into a support channel: X-SIGNATURE already travelled to
     * DANA over the wire and cannot be reversed into the private key, and these
     * APIs carry no bearer token. The private key itself never appears here and
     * must never be shared with anybody, including a provider.
     */
    private function dump(DanaQrisService $qris): void
    {
        if (! $this->option('dump')) {
            return;
        }

        $exchange = $qris->lastExchange();

        if ($exchange === null) {
            $this->components->warn('No exchange was captured - the request never left this server.');

            return;
        }

        $this->newLine();
        $this->line('<fg=gray>--- REQUEST ---------------------------------------------------</>');
        $this->line('POST '.$exchange['url']);

        foreach ($exchange['headers'] as $name => $value) {
            $this->line($name.': '.$value);
        }

        $this->newLine();
        $this->line($this->pretty((string) $exchange['request_body']));

        $this->newLine();
        $this->line('<fg=gray>--- RESPONSE (HTTP '.$exchange['http_status'].') -------------------------------</>');
        $this->line($this->pretty((string) $exchange['response_body']));

        $this->newLine();
        $this->line('<fg=gray>--- CURL ------------------------------------------------------</>');
        $this->line($this->curl($exchange));
        $this->line('<fg=gray>---------------------------------------------------------------</>');
        $this->line('<fg=gray>Note: X-SIGNATURE is bound to X-TIMESTAMP. Re-running this curl</>');
        $this->line('<fg=gray>later reproduces the request but the signature will be stale.</>');
    }

    /**
     * The same request as a curl command, which is what a provider's support
     * team asks for when they want to replay it on their side.
     *
     * The signature is not regenerated here and cannot be: it covers the
     * timestamp in the header, so this reproduces one specific request rather
     * than being a tool for making new ones.
     *
     * @param  array<string, mixed>  $exchange
     */
    private function curl(array $exchange): string
    {
        $lines = ["curl -i -X POST '".$exchange['url']."' \\"];
        $lines[] = "  -H 'Content-Type: application/json' \\";
        $lines[] = "  -H 'Accept: application/json' \\";

        foreach ($exchange['headers'] as $name => $value) {
            $lines[] = "  -H '".$name.': '.$this->shellSafe((string) $value)."' \\";
        }

        $lines[] = "  -d '".$this->shellSafe((string) $exchange['request_body'])."'";

        return implode(PHP_EOL, $lines);
    }

    /** Closes a single-quoted shell string safely around any apostrophe. */
    private function shellSafe(string $value): string
    {
        return str_replace("'", "'\''", $value);
    }

    /** Re-indents JSON for a human reading it in a chat window. */
    private function pretty(string $body): string
    {
        $decoded = json_decode($body, true);

        if (! is_array($decoded)) {
            return $body;
        }

        return (string) json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * The log file that actually exists.
     *
     * The 'dana' channel uses the daily driver, so Laravel writes
     * dana-YYYY-MM-DD.log. Printing "dana.log" sent somebody to a path that is
     * never created, at the exact moment they needed the response body.
     */
    private function logPath(): string
    {
        return 'storage/logs/dana-'.now()->format('Y-m-d').'.log';
    }

    private function pass(string $scenario, string $detail): void
    {
        $this->components->twoColumnDetail($scenario, '<fg=green>PASS</> <fg=gray>'.$detail.'</>');
    }

    private function reportFailure(string $scenario, Throwable $e): void
    {
        $reason = $e instanceof DanaException
            ? (string) ($e->context['reason'] ?? $e->getMessage())
            : $e->getMessage();

        $code = $e instanceof DanaException ? ($e->context['response_code'] ?? null) : null;

        $this->components->twoColumnDetail($scenario, '<fg=red>FAIL</>');
        $this->line('  <fg=red>'.$reason.'</>');

        if ($code !== null) {
            $this->line('  <fg=gray>responseCode: '.$code.'</>');
        }

        $this->line('  <fg=gray>Full request and response: '.$this->logPath().'</>');
    }
}
