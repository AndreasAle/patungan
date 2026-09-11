<?php

namespace Tests\Unit;

use App\Payouts\AccountNameMatcher;
use PHPUnit\Framework\TestCase;

/**
 * The self-ownership check, which has to be wrong in neither direction.
 *
 * Too strict and real people are locked out of their own money. Too loose and
 * the check approves anybody while looking like a safeguard, which is worse
 * than not having one.
 */
class AccountNameMatcherTest extends TestCase
{
    private AccountNameMatcher $matcher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->matcher = new AccountNameMatcher;
    }

    public function test_it_accepts_the_same_name_however_the_bank_wrote_it(): void
    {
        $claimed = 'Andreas Alessandro Fernandito';

        foreach ([
            'ANDREAS ALESSANDRO FERNANDITO',   // banks upper-case everything
            'andreas alessandro fernandito',
            '  Andreas   Alessandro  Fernandito ',
            'ANDREAS A FERNANDITO',            // middle name as an initial
            'Fernandito, Andreas Alessandro',  // surname first, with a comma
            'BPK ANDREAS ALESSANDRO FERNANDITO', // honorific prefix
        ] as $fromBank) {
            $this->assertTrue($this->matcher->matches($claimed, $fromBank), $fromBank);
        }
    }

    public function test_it_accepts_a_shorter_name_on_either_side(): void
    {
        // People sign up as "Andreas Fernandito" and the bank has the full name.
        $this->assertTrue($this->matcher->matches('Andreas Fernandito', 'ANDREAS ALESSANDRO FERNANDITO'));

        /*
         * And the reverse: banks truncate to fit a fixed field, so a record can
         * legitimately drop the surname. Rejecting this would lock somebody out
         * of their own money over a limitation at their bank.
         */
        $this->assertTrue($this->matcher->matches('Andreas Alessandro Fernandito', 'ANDREAS ALESSANDRO'));
    }

    public function test_it_rejects_a_different_person(): void
    {
        $claimed = 'Andreas Alessandro Fernandito';

        foreach ([
            'BUDI SANTOSO',
            'ANDREAS WIJAYA',            // shares a first name only
            'SITI ALESSANDRO FERNANDITO', // shares everything but the first name
        ] as $fromBank) {
            $this->assertFalse($this->matcher->matches($claimed, $fromBank), $fromBank);
        }
    }

    public function test_a_single_word_never_identifies_somebody_with_a_full_name(): void
    {
        /*
         * "BUDI" matches "BUDI SANTOSO" and "BUDI HARTONO" equally well, which
         * is to say it identifies nobody. Accepting it would let one first name
         * unlock any account sharing it.
         */
        $this->assertFalse($this->matcher->matches('Budi', 'BUDI SANTOSO'));
        $this->assertFalse($this->matcher->matches('Budi Santoso', 'BUDI'));

        // Two one-word names are all the information either side has.
        $this->assertTrue($this->matcher->matches('Budi', 'BUDI'));
    }

    public function test_empty_input_never_matches(): void
    {
        // A blank on either side must not read as agreement.
        $this->assertFalse($this->matcher->matches('', 'ANDREAS FERNANDITO'));
        $this->assertFalse($this->matcher->matches('Andreas Fernandito', ''));
        $this->assertFalse($this->matcher->matches('   ', '  '));
        $this->assertFalse($this->matcher->matches('123', 'ANDREAS'));
    }
}
