<?php

namespace Tests\Support;

/**
 * Throwaway RSA key pairs for the DOKU signature tests.
 *
 * PHP on Windows will not generate a key unless it can find an openssl.cnf, so
 * the usual locations are tried explicitly. On a normal Linux box none of this
 * is needed and the default configuration is used.
 */
trait GeneratesRsaKeys
{
    /** @return array{private: string, public: string} */
    protected function rsaKeyPair(): array
    {
        $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
        $config = $this->opensslConfig();

        if ($config !== null) {
            $options['config'] = $config;
        }

        $key = openssl_pkey_new($options);

        if ($key === false) {
            $this->markTestSkipped('OpenSSL cannot generate a key here: no usable openssl.cnf was found.');
        }

        $exportOptions = $config !== null ? ['config' => $config] : [];
        openssl_pkey_export($key, $private, null, $exportOptions);

        return ['private' => $private, 'public' => openssl_pkey_get_details($key)['key']];
    }

    private function opensslConfig(): ?string
    {
        // A key generated with the default configuration means none is needed.
        if (@openssl_pkey_new(['private_key_bits' => 512, 'private_key_type' => OPENSSL_KEYTYPE_RSA]) !== false) {
            return null;
        }

        $candidates = array_filter([
            getenv('OPENSSL_CONF') ?: null,
            'C:/xampp/php/extras/ssl/openssl.cnf',
            'C:/xampp/apache/conf/openssl.cnf',
            '/etc/ssl/openssl.cnf',
            '/usr/local/ssl/openssl.cnf',
        ]);

        foreach ($candidates as $candidate) {
            if (is_readable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
