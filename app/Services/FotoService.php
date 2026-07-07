<?php

namespace App\Services;

use App\Models\PersonaFoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class FotoService
{
    public function guardarFoto(UploadedFile $archivo, int $personaId): PersonaFoto
    {
        $foto = PersonaFoto::firstOrNew(['persona_id' => $personaId]);

        $anio      = now()->format('Y');
        $mes       = now()->format('m');
        $timestamp = now()->timestamp;
        $ext       = strtolower($archivo->getClientOriginalExtension());

        $rutaOriginal  = "fotos/{$anio}/{$mes}/persona_{$personaId}_{$timestamp}.{$ext}";
        $rutaThumbnail = "fotos/{$anio}/{$mes}/persona_{$personaId}_{$timestamp}_thumb.jpg";

        if ($foto->foto_ruta) {
            Storage::disk('contratos')->delete($foto->foto_ruta);
        }
        if ($foto->foto_thumbnail_ruta) {
            Storage::disk('contratos')->delete($foto->foto_thumbnail_ruta);
        }

        Storage::disk('contratos')->put($rutaOriginal, file_get_contents($archivo->getRealPath()));
        Storage::disk('contratos')->put($rutaThumbnail, $this->thumbnail($archivo->getRealPath(), $ext));

        $foto->fill([
            'persona_id'          => $personaId,
            'foto_ruta'           => $rutaOriginal,
            'foto_thumbnail_ruta' => $rutaThumbnail,
        ])->save();

        return $foto;
    }

    private function thumbnail(string $path, string $ext): string
    {
        $src = match($ext) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($path),
            'png'         => @imagecreatefrompng($path),
            'webp'        => @imagecreatefromwebp($path),
            default       => false,
        };

        if (!$src) {
            return file_get_contents($path);
        }

        $w    = imagesx($src);
        $h    = imagesy($src);
        $side = min($w, $h);
        $x    = (int)(($w - $side) / 2);
        $y    = (int)(($h - $side) / 2);

        $thumb = imagecreatetruecolor(100, 100);
        $white = imagecolorallocate($thumb, 255, 255, 255);
        imagefilledrectangle($thumb, 0, 0, 100, 100, $white);
        imagecopyresampled($thumb, $src, 0, 0, $x, $y, 100, 100, $side, $side);

        ob_start();
        imagejpeg($thumb, null, 85);
        $content = ob_get_clean();

        imagedestroy($src);
        imagedestroy($thumb);

        return $content;
    }
}
