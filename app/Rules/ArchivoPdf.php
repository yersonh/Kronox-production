<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Valida que el archivo subido sea realmente un PDF.
 *
 * Comprueba la extensión declarada y la firma binaria del archivo (%PDF-),
 * en lugar de confiar en finfo/MIME — que en Railway misdetecta PDFs
 * escaneados y rechaza archivos válidos. Esto bloquea que se suban
 * HTML/SVG/scripts disfrazados de documento (vector de XSS almacenado).
 */
class ArchivoPdf implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!$value instanceof UploadedFile || !$value->isValid()) {
            $fail('El archivo no es válido.');
            return;
        }

        if (strtolower($value->getClientOriginalExtension()) !== 'pdf') {
            $fail('El archivo debe tener extensión .pdf.');
            return;
        }

        $handle   = @fopen($value->getRealPath(), 'rb');
        $cabecera = $handle ? fread($handle, 5) : '';
        if ($handle) {
            fclose($handle);
        }

        if ($cabecera !== '%PDF-') {
            $fail('El archivo no es un PDF válido.');
        }
    }
}
