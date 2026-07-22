<?php

namespace App\Services;

use App\Models\Evento;
use App\Models\Tarea;
use App\Models\TareaCompromiso;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class PdfApiService
{
    private string $baseUrl;

    private ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.pdf_api.url', ''), '/');
        $this->apiKey  = config('services.pdf_api.key');
    }

    /**
     * Cabeceras comunes para autenticar contra el microservicio pdf-api.
     */
    private function headers(): array
    {
        return $this->apiKey ? ['X-API-Key' => $this->apiKey] : [];
    }

    /**
     * Analiza el PDF de soporte de un item y devuelve el JSON de Gemini.
     * Retorna null si el item no tiene soporte, no se puede leer, o la API falla.
     */
    public function analizarSoporte(string $tipo, int $id): ?array
    {
        [$path, $filename] = $this->resolverSoporte($tipo, $id);

        if (!$path) {
            return null;
        }

        if (!Storage::disk('contratos')->exists($path)) {
            return null;
        }

        $contenido = Storage::disk('contratos')->get($path);

        try {
            $response = Http::timeout(30)
                ->withHeaders($this->headers())
                ->attach('archivo', $contenido, $filename, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Analiza una minuta de contrato y extrae sus datos estructurados.
     * Retorna null si no se puede leer el archivo o la API falla.
     */
    public function analyzeMinuta(string $path, string $filename): ?array
    {
        if (!Storage::disk('contratos')->exists($path)) {
            return null;
        }

        $contenido = Storage::disk('contratos')->get($path);

        try {
            $response = Http::timeout(60)
                ->withHeaders($this->headers())
                ->attach('archivo', $contenido, $filename, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze-minuta");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Analiza un acta de reunión y genera un resumen ejecutivo de dos párrafos.
     * Retorna null si no se puede leer el archivo o la API falla.
     */
    public function analyzeActa(string $path, string $filename): ?array
    {
        if (!Storage::disk('contratos')->exists($path)) {
            return null;
        }

        $contenido = Storage::disk('contratos')->get($path);

        try {
            $response = Http::timeout(60)
                ->withHeaders($this->headers())
                ->attach('archivo', $contenido, $filename, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze-acta");

            return $response->successful() ? $response->json() : null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Analiza una planilla de pago de seguridad social y extrae sus datos.
     */
    public function analyzePlanilla(string $path, string $filename): ?array
    {
        if (!Storage::disk('contratos')->exists($path)) {
            return null;
        }

        $contenido = Storage::disk('contratos')->get($path);

        try {
            $response = Http::timeout(60)
                ->withHeaders($this->headers())
                ->attach('archivo', $contenido, $filename, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze-planilla");

            return $response->successful() ? $response->json() : null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Analiza una resolución de supervisor y extrae sus datos estructurados.
     */
    public function analyzeSupervisor(string $path, string $filename): ?array
    {
        if (!Storage::disk('contratos')->exists($path)) {
            return null;
        }

        $contenido = Storage::disk('contratos')->get($path);

        try {
            $response = Http::timeout(60)
                ->withHeaders($this->headers())
                ->attach('archivo', $contenido, $filename, ['Content-Type' => 'application/pdf'])
                ->post("{$this->baseUrl}/analyze-supervisor");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Devuelve [ruta_en_disco, nombre_archivo] para el soporte del item.
     */
    private function resolverSoporte(string $tipo, int $id): array
    {
        $path = match ($tipo) {
            'evento'     => Evento::find($id)?->documento_soporte,
            'tarea'      => Tarea::find($id)?->soporte_cumplimiento,
            'compromiso' => TareaCompromiso::find($id)?->soporte_cumplimiento,
            default      => null,
        };

        if (!$path) {
            return [null, null];
        }

        return [$path, "soporte_{$tipo}_{$id}.pdf"];
    }
}
