<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Gives a model a public UUID alongside its auto-incrementing primary key, so
 * internal ids never have to leak into URLs or API payloads.
 */
trait HasUuid
{
    protected static function bootHasUuid(): void
    {
        static::creating(function ($model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
