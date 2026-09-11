<?php

namespace App\Payouts;

/**
 * Decides whether a bank's account holder is the person who owns the account
 * here.
 *
 * This is the one thing that turns "rekening harus atas nama kamu sendiri" in
 * the terms into something the system can check. It is also the easiest place
 * in this codebase to be wrong in both directions at once:
 *
 *  - Too strict and legitimate people are blocked. Indonesian bank records are
 *    upper-cased, carry middle names the owner never uses, abbreviate to
 *    initials, and often keep a maiden name. "ANDREAS A FERNANDITO" and
 *    "Andreas Alessandro Fernandito" are the same person.
 *  - Too loose and the check means nothing, which is worse than not having it,
 *    because it looks like a safeguard while approving anybody.
 *
 * The rule settled on: compare the significant words, ignore order, and accept
 * when the shorter name's words are all present in the longer one - treating a
 * single initial as matching a word it starts. That accepts every legitimate
 * shortening above and rejects a different person, which is what the check is
 * for.
 *
 * A mismatch is never an automatic rejection. It is a flag, and a person
 * decides.
 */
class AccountNameMatcher
{
    /**
     * Titles and honorifics banks append, which carry no identity.
     *
     * @var list<string>
     */
    private const NOISE = ['mr', 'mrs', 'ms', 'bpk', 'bapak', 'ibu', 'sdr', 'sdri', 'tn', 'ny'];

    public function matches(string $claimed, string $fromBank): bool
    {
        $claimedWords = $this->words($claimed);
        $bankWords = $this->words($fromBank);

        if ($claimedWords === [] || $bankWords === []) {
            return false;
        }

        // Compare the shorter against the longer, so an abbreviated bank record
        // and an abbreviated profile name both work.
        [$shorter, $longer] = count($claimedWords) <= count($bankWords)
            ? [$claimedWords, $bankWords]
            : [$bankWords, $claimedWords];

        /*
         * A single word on one side is not enough to identify anybody. "BUDI"
         * would match "BUDI SANTOSO" and "BUDI HARTONO" alike, so a one-word
         * name only passes when the other side is also one word.
         */
        if (count($shorter) === 1 && count($longer) > 1) {
            return false;
        }

        foreach ($shorter as $word) {
            if (! $this->presentIn($word, $longer)) {
                return false;
            }
        }

        return true;
    }

    /** @param list<string> $candidates */
    private function presentIn(string $word, array $candidates): bool
    {
        foreach ($candidates as $candidate) {
            if ($word === $candidate) {
                return true;
            }

            // An initial stands for the word it begins: "A" matches "ALESSANDRO".
            if (strlen($word) === 1 && str_starts_with($candidate, $word)) {
                return true;
            }

            if (strlen($candidate) === 1 && str_starts_with($word, $candidate)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Lower-cased words, punctuation and honorifics removed.
     *
     * @return list<string>
     */
    private function words(string $name): array
    {
        $normalised = strtolower(trim($name));
        $normalised = (string) preg_replace('/[^a-z\s]/', ' ', $normalised);

        $words = preg_split('/\s+/', $normalised, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_filter(
            $words,
            fn (string $word): bool => ! in_array($word, self::NOISE, true),
        ));
    }
}
