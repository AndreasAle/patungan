<?php

/*
 * Creates public/storage without shelling out.
 *
 * `artisan storage:link` goes through exec(), which shared hosting disables -
 * on Hostinger it dies with "Call to undefined function exec()". symlink() is
 * usually left alone, so the link is made directly here.
 *
 * Nothing in here is allowed to fail the deploy. A missing public link means
 * broken images, not a broken ledger, and it is not worth aborting a release
 * before the caches are rebuilt. Errors are printed rather than thrown, because
 * shared hosting turns display_errors off and a silent failure is what sent us
 * chasing this in the first place.
 */

ini_set('display_errors', 'stderr');

$root = dirname(__DIR__);
$link = $root.'/public/storage';
$target = $root.'/storage/app/public';

if (is_link($link)) {
    echo "    already linked\n";

    exit(0);
}

if (is_dir($link)) {
    // A real directory, not a link. Someone uploaded into it, or a previous
    // deploy copied files there. Removing it would delete those files.
    echo "    public/storage is a real directory, not a link - left alone\n";

    exit(0);
}

if (! is_dir($target) && ! @mkdir($target, 0755, true)) {
    echo "    could not create storage/app/public\n";

    exit(0);
}

if (! function_exists('symlink')) {
    echo "    symlink() is disabled on this host\n";
    echo "    create public/storage -> storage/app/public in hPanel File Manager\n";

    exit(0);
}

if (@symlink($target, $link)) {
    echo "    linked\n";

    exit(0);
}

$why = error_get_last()['message'] ?? 'no reason reported';
echo "    could not link: {$why}\n";
echo "    create public/storage -> storage/app/public in hPanel File Manager\n";

exit(0);
