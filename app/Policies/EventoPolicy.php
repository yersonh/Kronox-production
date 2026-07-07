<?php

namespace App\Policies;

use App\Models\Evento;
use App\Models\User;

class EventoPolicy
{
    private function esGestor(User $user): bool
    {
        return in_array($user->rol, ['digitador', 'admin', 'super_admin']);
    }

    private function esAdmin(User $user): bool
    {
        return in_array($user->rol, ['admin', 'super_admin']);
    }

    public function create(User $user): bool
    {
        return $this->esGestor($user);
    }

    public function update(User $user, Evento $evento): bool
    {
        if (!$this->esGestor($user)) {
            return false;
        }
        // Eventos cerrados o cancelados no se pueden editar
        return !in_array($evento->estado, ['cerrado', 'cancelado']);
    }

    public function delete(User $user, Evento $evento): bool
    {
        // Eliminar eventos es solo para administradores (no digitadores).
        if (!$this->esAdmin($user)) {
            return false;
        }
        // No se pueden eliminar eventos en estado cerrado, cancelado o finalizado
        return !in_array($evento->estado, ['cerrado', 'cancelado', 'finalizado', 'en_curso']);
    }

    public function finalizar(User $user, Evento $evento): bool
    {
        // Permite finalizar en_curso normalmente, o cerrado en destiempo
        if (!in_array($evento->estado, ['en_curso', 'cerrado'])) {
            return false;
        }
        $esResponsable = $user->persona_id && $user->persona_id === $evento->responsable_id;
        return $esResponsable || $this->esGestor($user);
    }

    public function verConclusiones(User $user, Evento $evento): bool
    {
        return in_array($user->rol, ['admin', 'digitador', 'super_admin']);
    }

    /** Puede ver el evento y sus documentos/fotos: gestores, el responsable o un invitado. */
    public function view(User $user, Evento $evento): bool
    {
        if ($this->esGestor($user)) {
            return true;
        }

        if (!$user->persona_id) {
            return false;
        }

        return $user->persona_id === $evento->responsable_id
            || $evento->invitados()->where('persona_id', $user->persona_id)->exists();
    }

    /** Puede subir/eliminar documentos y fotos: gestores siempre; el responsable salvo evento cancelado. */
    public function gestionarDocumentos(User $user, Evento $evento): bool
    {
        if ($this->esGestor($user)) {
            return true;
        }

        return $user->persona_id
            && $user->persona_id === $evento->responsable_id
            && $evento->estado !== 'cancelado';
    }
}
