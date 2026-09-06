{{--
    Branded verification email.

    Built with tables and inline styles because that is what mail clients
    reliably render, and the logo is embedded as an attachment so it shows up
    without depending on a public URL.
--}}
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Kode verifikasi Patungan</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f6f3; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#132a20;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        Kode verifikasi kamu {{ $code }}, berlaku {{ $minutes }} menit.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f6f3; padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="max-width:520px; background-color:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e2ece6;">

                    {{-- Header --}}
                    <tr>
                        <td style="background-color:#15563a; padding:28px 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="vertical-align:middle;">
                                        <img src="{{ $message->embed(public_path('images/logo-email.png')) }}"
                                             width="40" height="40" alt="Patungan"
                                             style="display:block; border:0; border-radius:11px;">
                                    </td>
                                    <td style="vertical-align:middle; padding-left:12px;">
                                        <span style="font-size:19px; font-weight:800; letter-spacing:-0.4px; color:#ffffff;">Patungan</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding:32px 32px 8px;">
                            <p style="margin:0 0 6px; font-size:20px; font-weight:800; letter-spacing:-0.4px; color:#15563a;">
                                Halo, {{ $name }}
                            </p>
                            <p style="margin:0; font-size:14px; line-height:22px; color:#5b6b63;">
                                Masukkan kode ini di halaman verifikasi untuk mengaktifkan akun Patungan kamu.
                            </p>
                        </td>
                    </tr>

                    {{-- The code --}}
                    <tr>
                        <td style="padding:24px 32px 8px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                   style="background-color:#eef7f0; border:1px solid #d6e9dd; border-radius:16px;">
                                <tr>
                                    <td align="center" style="padding:22px 16px;">
                                        <p style="margin:0 0 8px; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#5b6b63;">
                                            Kode verifikasi
                                        </p>
                                        <p style="margin:0; font-size:34px; font-weight:800; letter-spacing:9px; color:#15563a; font-family:'Courier New',Courier,monospace;">
                                            {{ $code }}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:12px 32px 0;">
                            <p style="margin:0; font-size:13px; line-height:21px; color:#5b6b63;">
                                Kode ini berlaku <strong style="color:#132a20;">{{ $minutes }} menit</strong>. Jangan bagikan ke siapa pun —
                                tim Patungan tidak akan pernah meminta kode ini.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 32px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2ece6;">
                                <tr>
                                    <td style="padding-top:18px;">
                                        <p style="margin:0; font-size:12px; line-height:19px; color:#8a988f;">
                                            Merasa tidak mendaftar di Patungan? Abaikan saja email ini, akunnya tidak akan aktif tanpa kode di atas.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="margin:20px 0 0; font-size:11px; color:#8a988f;">
                    Patungan &middot; Kumpulin uang bareng tanpa drama
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
