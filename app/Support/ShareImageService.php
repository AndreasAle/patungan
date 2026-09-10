<?php

namespace App\Support;

use App\Models\Patungan;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Draws the 1200x630 card WhatsApp shows when a patungan link is pasted.
 *
 * Rendered with GD rather than a headless browser. A browser would give nicer
 * typography and would also mean running Chromium on shared hosting to produce
 * a picture of six words, which is not a trade this product should make.
 *
 * Two honest limitations are handled rather than hidden:
 *
 *  - GD needs a TrueType font to draw text at this size, and none is bundled
 *    (font licences and a 300KB binary in the repository are both real costs).
 *    A list of likely locations is tried, including a path the operator can
 *    drop a font into. If nothing is found, the generated card is skipped
 *    entirely and the static brand image is used instead - a preview with no
 *    text beats one rendered in GD's built-in bitmap font, which at 1200px
 *    looks like a 1998 error page.
 *
 *  - Progress changes on every payment. The image is cached by a key that
 *    includes the progress figures, so a card is drawn once per distinct state
 *    and a patungan nobody has paid into is drawn once, ever.
 */
class ShareImageService
{
    public const WIDTH = 1200;

    public const HEIGHT = 630;

    /** A day is far longer than the window in which a link is pasted and read. */
    private const CACHE_SECONDS = 86400;

    /** Brand colours, as [r, g, b]. */
    private const DEEP = [11, 56, 40];

    private const DEEP_SOFT = [17, 78, 55];

    private const LIME = [190, 242, 100];

    private const WHITE = [255, 255, 255];

    private const MUTED = [168, 199, 182];

    private const TRACK = [30, 92, 66];

    /**
     * The cache key for this patungan's current state.
     *
     * Progress is part of the key rather than something that expires a cached
     * image: it means a payment invalidates the card by producing a different
     * key, with no invalidation logic to get wrong.
     */
    public function cacheKey(Patungan $patungan): string
    {
        return 'share-image:'.$patungan->public_token.':'
            .$patungan->paid_participant_count.':'
            .$patungan->participant_count.':'
            .$patungan->collected_amount.':'
            .md5($patungan->title);
    }

    public function isAvailable(): bool
    {
        return extension_loaded('gd')
            && function_exists('imagettftext')
            && $this->font() !== null;
    }

    /**
     * PNG bytes, or null when this host cannot draw text.
     *
     * Never throws. A failure here means a slightly duller link preview, and
     * that is not worth a 500 on a page somebody is trying to pay through.
     */
    public function render(Patungan $patungan): ?string
    {
        if (! $this->isAvailable()) {
            return null;
        }

        try {
            return $this->draw($patungan);
        } catch (Throwable $e) {
            Log::warning('Share image could not be drawn', [
                'patungan' => $patungan->public_token,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function draw(Patungan $patungan): string
    {
        $font = (string) $this->font();
        $image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);

        $deep = $this->colour($image, self::DEEP);
        $deepSoft = $this->colour($image, self::DEEP_SOFT);
        $lime = $this->colour($image, self::LIME);
        $white = $this->colour($image, self::WHITE);
        $muted = $this->colour($image, self::MUTED);
        $track = $this->colour($image, self::TRACK);

        imagefilledrectangle($image, 0, 0, self::WIDTH, self::HEIGHT, $deep);

        /*
         * A gentle wash from the top right. Drawn as thin vertical bands rather
         * than a radial blend because GD has no gradient primitive, and an
         * ellipse at this size reads as a hard disc sitting on the card - a
         * rendering mistake rather than lighting.
         */
        for ($x = 620; $x < self::WIDTH; $x++) {
            $t = ($x - 620) / (self::WIDTH - 620);
            $band = imagecolorallocate(
                $image,
                (int) (self::DEEP[0] + (self::DEEP_SOFT[0] - self::DEEP[0]) * $t),
                (int) (self::DEEP[1] + (self::DEEP_SOFT[1] - self::DEEP[1]) * $t),
                (int) (self::DEEP[2] + (self::DEEP_SOFT[2] - self::DEEP[2]) * $t),
            );

            if ($band !== false) {
                imageline($image, $x, 0, $x, self::HEIGHT, $band);
            }
        }

        // Lime rule, the brand's one accent.
        imagefilledrectangle($image, 80, 96, 152, 104, $lime);

        imagettftext($image, 26, 0, 80, 90, $muted, $font, 'PATUNGAN');

        foreach ($this->wrap($font, 58, $patungan->title, 1040, 2) as $index => $line) {
            imagettftext($image, 58, 0, 80, 210 + ($index * 76), $white, $font, $line);
        }

        $perPerson = filled($patungan->equal_amount)
            ? Money::format((int) $patungan->equal_amount).'/orang'
            : 'Nominal beda-beda';

        imagettftext($image, 34, 0, 80, 390, $lime, $font, $perPerson);

        $paid = (int) $patungan->paid_participant_count;
        $total = (int) $patungan->participant_count;

        imagettftext($image, 30, 0, 80, 452, $muted, $font, $paid.' dari '.$total.' sudah bayar');

        // Progress bar.
        $barTop = 500;
        $barWidth = 1040;
        $ratio = $total > 0 ? min($paid / $total, 1) : 0.0;

        $this->roundedBar($image, 80, $barTop, $barWidth, 20, $track);

        if ($ratio > 0) {
            $this->roundedBar($image, 80, $barTop, (int) max($barWidth * $ratio, 20), 20, $lime);
        }

        imagettftext(
            $image,
            26,
            0,
            80,
            578,
            $muted,
            $font,
            Money::format((int) $patungan->collected_amount).' / '.Money::format((int) $patungan->target_amount),
        );

        ob_start();
        imagepng($image, null, 6);
        $png = (string) ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    /** @param resource|\GdImage $image */
    private function roundedBar($image, int $x, int $y, int $width, int $height, int $colour): void
    {
        $radius = (int) ($height / 2);

        imagefilledrectangle($image, $x + $radius, $y, $x + $width - $radius, $y + $height, $colour);
        imagefilledellipse($image, $x + $radius, $y + $radius, $height, $height, $colour);
        imagefilledellipse($image, $x + $width - $radius, $y + $radius, $height, $height, $colour);
    }

    /**
     * Breaks a title onto at most $maxLines lines, measured rather than guessed.
     *
     * A title too long for the space is truncated with an ellipsis instead of
     * running off the edge of the card.
     *
     * @return list<string>
     */
    private function wrap(string $font, int $size, string $text, int $maxWidth, int $maxLines): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current.' '.$word;

            if ($this->widthOf($font, $size, $candidate) <= $maxWidth) {
                $current = $candidate;

                continue;
            }

            if ($current !== '') {
                $lines[] = $current;
            }

            $current = $word;

            if (count($lines) === $maxLines) {
                break;
            }
        }

        if ($current !== '' && count($lines) < $maxLines) {
            $lines[] = $current;
        }

        if ($lines === []) {
            return [''];
        }

        $last = count($lines) - 1;

        while ($this->widthOf($font, $size, $lines[$last]) > $maxWidth && strlen($lines[$last]) > 4) {
            $lines[$last] = substr($lines[$last], 0, -2).'…';
        }

        return $lines;
    }

    private function widthOf(string $font, int $size, string $text): int
    {
        $box = imagettfbbox($size, 0, $font, $text);

        return $box === false ? 0 : abs($box[2] - $box[0]);
    }

    /** @param array{0: int, 1: int, 2: int} $rgb */
    private function colour(mixed $image, array $rgb): int
    {
        return (int) imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);
    }

    /**
     * The first usable TrueType font.
     *
     * The project path comes first so an operator can decide, then the fonts
     * that are actually present on a typical Linux host, then the Windows ones
     * that make this work in local development.
     */
    private function font(): ?string
    {
        static $resolved = false;
        static $path = null;

        if ($resolved) {
            return $path;
        }

        $resolved = true;

        $candidates = array_filter([
            config('patungan.share_image_font'),
            base_path('resources/fonts/share.ttf'),
            storage_path('app/fonts/share.ttf'),
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
            'C:/Windows/Fonts/segoeuib.ttf',
            'C:/Windows/Fonts/arialbd.ttf',
            'C:/Windows/Fonts/arial.ttf',
        ]);

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_readable($candidate)) {
                return $path = $candidate;
            }
        }

        return null;
    }
}
