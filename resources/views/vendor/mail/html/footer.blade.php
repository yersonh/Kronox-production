@php
    use App\Models\EntidadConfig;
    $entidad = EntidadConfig::first();
    $nombreEntidad = $entidad?->nombre ?? config('app.name', 'Kronox');
@endphp
<tr>
    <td>
        <table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
                <td class="content-cell" align="center" style="padding: 28px 32px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #64748b;">
                        © {{ date('Y') }} {{ $nombreEntidad }}. Todos los derechos reservados.
                    </p>
                    @if($entidad?->direccion || $entidad?->telefono)
                    <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8;">
                        @if($entidad->direccion) {{ $entidad->direccion }}@endif
                        @if($entidad->direccion && $entidad->telefono) &nbsp;·&nbsp; @endif
                        @if($entidad->telefono) Tel. {{ $entidad->telefono }}@endif
                    </p>
                    @endif
                    <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8;">
                        Sistema Kronox — Departamento de Sistemas
                    </p>
                    <p style="margin: 0; font-size: 10px; color: #b0bec5;">
                        Este mensaje es confidencial y de uso exclusivo del destinatario.
                        No responda a este correo automático.
                    </p>
                </td>
            </tr>
        </table>
    </td>
</tr>
