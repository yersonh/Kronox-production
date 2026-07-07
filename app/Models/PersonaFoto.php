<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PersonaFoto extends Model
{
    protected $table = 'persona_fotos';

    protected $fillable = ['persona_id', 'foto_ruta', 'foto_thumbnail_ruta'];

    protected $appends = ['tiene_foto', 'foto_url', 'foto_thumbnail_url'];

    public function getTieneFotoAttribute(): bool
    {
        return !empty($this->foto_ruta);
    }

    public function getFotoUrlAttribute(): string
    {
        $v = $this->updated_at?->timestamp ?? 0;
        return url("/api/personas/{$this->persona_id}/foto") . '?v=' . $v;
    }

    public function getFotoThumbnailUrlAttribute(): string
    {
        $v = $this->updated_at?->timestamp ?? 0;
        return url("/api/personas/{$this->persona_id}/foto/thumbnail") . '?v=' . $v;
    }
}
