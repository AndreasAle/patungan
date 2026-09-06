<?php

namespace App\Enums;

enum LedgerDirection: string
{
    case Credit = 'CREDIT';
    case Debit = 'DEBIT';

    /** Signed multiplier applied to the ledger amount when summing a balance. */
    public function sign(): int
    {
        return $this === self::Credit ? 1 : -1;
    }
}
