<?php

/*
 * Creates public/storage without shelling out.
 *
 * `artisan storage:link` goes through exec(), which shared hosting disables -
 * on Hostinger it dies with "Call to undefined function exec()". symlink() is
 * not on that block list, so the link is made directly here instead.
 */

$root = dirname(__DIR__);
$link = $root.'/public/storage';
$target = $root.'/storage/app/public';

if (is_link($link) || is_dir($link)) {
    echo "    already linked\n";

    exit(0);
}

if (! is_dir($target)) {
    mkdir($target, 0755, true);
}

if (@symlink($target, $link)) {
    echo "    linked\n";

    exit(0);
}

// Not fatal: uploads still work, they just will not be reachable over HTTP
// until someone makes the link by hand. Say so rather than failing the deploy.
echo "    could not link - create public/storage -> storage/app/public in hPanel\n";

exit(0);
