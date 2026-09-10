<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Support\ShareImageService;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Serves the picture WhatsApp fetches when a patungan link is pasted.
 *
 * Cached by a key that already contains the progress figures, so a payment
 * produces a different key rather than needing anything to be invalidated. A
 * patungan nobody has paid into is drawn exactly once.
 *
 * When the host cannot draw text - no TrueType font available - this redirects
 * to the static brand card instead of returning a broken image. A duller
 * preview is a fair outcome; a broken one makes the whole link look untrusted,
 * which is the opposite of the point.
 */
class ShareImageController extends Controller
{
    public function __construct(private readonly ShareImageService $images) {}

    public function show(string $token): Response
    {
        $patungan = Patungan::query()->where('public_token', $token)->firstOrFail();

        $png = Cache::remember(
            $this->images->cacheKey($patungan),
            now()->addDay(),
            fn (): ?string => $this->images->render($patungan),
        );

        if ($png === null) {
            return response('', 302, ['Location' => url('/og-default.png')]);
        }

        return response($png, 200, [
            'Content-Type' => 'image/png',
            /*
             * Long, and safe to be long: the URL's content is pinned by the
             * cache key, and a scraper that holds an older card for a day shows
             * a slightly stale count, never a wrong link.
             */
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
