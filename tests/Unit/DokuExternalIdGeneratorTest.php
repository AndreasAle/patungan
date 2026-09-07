<?php

namespace Tests\Unit;

use App\Payments\Doku\DokuExternalIdGenerator;
use PHPUnit\Framework\TestCase;

class DokuExternalIdGeneratorTest extends TestCase
{
    public function test_it_produces_a_numeric_string_within_dokus_length_limit(): void
    {
        $id = (new DokuExternalIdGenerator)->generate();

        $this->assertMatchesRegularExpression('/^\d+$/', $id);
        $this->assertLessThanOrEqual(DokuExternalIdGenerator::MAX_LENGTH, strlen($id));
        $this->assertTrue(DokuExternalIdGenerator::isValid($id));
    }

    public function test_ten_thousand_ids_in_a_tight_loop_are_all_distinct(): void
    {
        $generator = new DokuExternalIdGenerator;
        $seen = [];

        for ($i = 0; $i < 10000; $i++) {
            $seen[$generator->generate()] = true;
        }

        $this->assertCount(10000, $seen);
    }

    public function test_it_rejects_values_that_are_not_valid_external_ids(): void
    {
        $this->assertFalse(DokuExternalIdGenerator::isValid(''));
        $this->assertFalse(DokuExternalIdGenerator::isValid('abc123'));
        $this->assertFalse(DokuExternalIdGenerator::isValid(str_repeat('1', 33)));
    }
}
