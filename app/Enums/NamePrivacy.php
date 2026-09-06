<?php

namespace App\Enums;

enum NamePrivacy: string
{
    case Full = 'FULL';
    case Masked = 'MASKED';

    /** Masks each word of a display name, keeping its first and last character. */
    public function apply(string $name): string
    {
        if ($this === self::Full) {
            return $name;
        }

        $masked = preg_replace_callback('/\S+/u', function (array $matches): string {
            $word = $matches[0];
            $length = mb_strlen($word);

            if ($length <= 2) {
                return mb_substr($word, 0, 1).str_repeat('*', max($length - 1, 1));
            }

            return mb_substr($word, 0, 1).str_repeat('*', $length - 2).mb_substr($word, -1);
        }, $name);

        return $masked ?? $name;
    }
}
