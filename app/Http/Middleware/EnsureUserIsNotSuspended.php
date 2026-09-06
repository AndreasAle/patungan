<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A suspended organizer keeps read access to their history but cannot create
 * patungans, collect money, or withdraw a balance.
 */
class EnsureUserIsNotSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->isSuspended()) {
            abort(403, 'Akun kamu sedang dibekukan. Hubungi dukungan Patungan.');
        }

        return $next($request);
    }
}
