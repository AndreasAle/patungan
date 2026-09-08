<?php

namespace App\Http\Controllers;

use App\Models\SupportMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Takes a message from the help bubble.
 *
 * Open to anyone, because the people most likely to need help - payers with a
 * QRIS that will not settle - have no account. The route is rate limited, the
 * input is bounded, and nothing here trusts a field to be what it claims.
 */
class SupportMessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'contact' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'page' => ['nullable', 'string', 'max:200'],
            // A field no human sees; anything in it came from a bot.
            'website' => ['prohibited'],
        ], [
            'message.min' => 'Ceritakan sedikit lebih detail biar kami bisa bantu.',
            'contact.required' => 'Isi email atau nomor WhatsApp biar kami bisa balas.',
        ]);

        SupportMessage::create([
            'user_id' => $request->user()?->id,
            'name' => $data['name'],
            'contact' => $data['contact'],
            'message' => $data['message'],
            'page' => $data['page'] ?? null,
        ]);

        return response()->json([
            'message' => 'Pesan kamu sudah masuk. Kami balas lewat kontak yang kamu tinggalkan.',
        ], 201);
    }
}
