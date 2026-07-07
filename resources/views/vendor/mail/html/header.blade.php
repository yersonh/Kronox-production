@php
    use App\Models\EntidadConfig;
    $entidad       = EntidadConfig::first();
    $nombreEntidad = $entidad?->nombre ?? config('app.name', 'Kronox');
    $logoUrl       = $entidad?->logo_ruta ? rtrim(config('app.url'), '/') . '/api/entidad-config/logo' : null;
@endphp
<tr>
    <td class="header" style="padding: 32px 0; text-align: center; background-color: #1e3a5f;">
        <a href="{{ config('app.url') }}" style="display: inline-block; text-decoration: none;">
            <div style="width:90px;height:90px;margin:0 auto;border-radius:50%;overflow:hidden;border:3px solid #ca8a04;background-color:white;">
                @if($logoUrl)
                    <img src="{{ $logoUrl }}"
                         alt="{{ $nombreEntidad }}"
                         width="90" height="90"
                         style="width:100%;height:100%;object-fit:cover;display:block;">
                @else
                    <span style="display:block;line-height:90px;font-size:32px;font-weight:700;color:#1e3a5f;text-align:center;">
                        {{ strtoupper(substr($nombreEntidad, 0, 1)) }}
                    </span>
                @endif
            </div>
            <p style="margin:14px 0 0;color:white;font-size:17px;font-weight:700;letter-spacing:0.5px;">
                {{ $nombreEntidad }}
            </p>
            @if($entidad?->eslogan)
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:12px;">
                {{ $entidad->eslogan }}
            </p>
            @endif
        </a>
    </td>
</tr>
