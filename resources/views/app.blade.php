<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#0d4d2c">

        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/favicon.svg">

        <title inertia>{{ config('app.name', 'Patungan') }}</title>

        {{--
            Open Graph, rendered server side.

            WhatsApp's scraper does not run JavaScript, so anything Inertia sets
            from React arrives too late to appear in a link preview. These come
            from a "meta" prop, which is present only on the pages that are
            actually shared - a group patungan link. Without it a shared link
            previews as the generic homepage, which reads like a suspicious
            forward rather than an invitation from a friend.
        --}}
        @php($meta = $page['props']['meta'] ?? null)
        @if ($meta)
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="Patungan">
            <meta property="og:title" content="{{ $meta['title'] }}">
            <meta property="og:description" content="{{ $meta['description'] }}">
            <meta property="og:url" content="{{ $meta['url'] }}">
            <meta property="og:image" content="{{ $meta['image'] }}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{{ $meta['title'] }}">
            <meta name="twitter:description" content="{{ $meta['description'] }}">
            <meta name="twitter:image" content="{{ $meta['image'] }}">
            <meta name="description" content="{{ $meta['description'] }}">
        @endif

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,500,600,700,800" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
