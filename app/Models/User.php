<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\CustomVerifyEmail;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name', 'email', 'password', 'rol', 'persona_id', 'activo', 'must_change_password'
    ];

    protected $hidden = [
        'password', 'remember_token'
    ];

    protected $appends = ['foto_url', 'foto_thumbnail_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            'activo'               => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    // URL de foto de perfil — apunta a la persona si existe, si no a la imagen default
    public function getFotoUrlAttribute(): string
    {
        if ($this->persona_id) {
            $v = $this->fotoPersona?->updated_at?->timestamp ?? $this->updated_at?->timestamp ?? 0;
            return url("/api/personas/{$this->persona_id}/foto") . '?v=' . $v;
        }
        return url('/images/imagendefault.png');
    }

    public function getFotoThumbnailUrlAttribute(): string
    {
        if ($this->persona_id) {
            $v = $this->fotoPersona?->updated_at?->timestamp ?? $this->updated_at?->timestamp ?? 0;
            return url("/api/personas/{$this->persona_id}/foto/thumbnail") . '?v=' . $v;
        }
        return url('/images/imagendefault.png');
    }

    // Roles helpers
    public function esAdmin(): bool
    {
        return in_array($this->rol, ['admin', 'super_admin']);
    }

    public function esSupervisorContratos(): bool
    {
        return $this->rol === 'supervisor_contratos';
    }

    public function puedeGestionarContratos(): bool
    {
        return $this->rol === 'supervisor_contratos';
    }
    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null;
    }

    // Relaciones
    public function fotoPersona()
    {
        return $this->hasOne(PersonaFoto::class, 'persona_id', 'persona_id');
    }

    public function contratista()
    {
        return $this->hasOne(Contratista::class, 'persona_id', 'persona_id');
    }

    public function funcionario()
    {
        return $this->hasOne(Funcionario::class, 'persona_id', 'persona_id');
    }

    public function eventos()
    {
        return $this->hasMany(Evento::class);
    }

    public function tareas()
    {
        return $this->hasMany(Tarea::class);
    }

    public function tareasCreadas()
    {
        return $this->hasMany(Tarea::class, 'user_id');
    }

    public function tareasCerradas()
    {
        return $this->hasMany(Tarea::class, 'cerrado_por');
    }
    public function sendEmailVerificationNotification()
    {
        $this->notify(new CustomVerifyEmail);
    }
}
