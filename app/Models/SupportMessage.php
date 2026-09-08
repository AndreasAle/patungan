<?php

namespace App\Models;

use App\Enums\SupportMessageStatus;
use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    use HasUuid;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => SupportMessageStatus::class,
            'read_at' => 'datetime',
            'replied_at' => 'datetime',
        ];
    }

    /** Null when a payer wrote it - they never had an account to begin with. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
