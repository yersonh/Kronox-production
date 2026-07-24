# Manuales de Usuario — Kronox Agenda

Esta carpeta contiene un manual de usuario independiente para cada rol del sistema.
Cada manual explica **cómo interactúa ese usuario con el sistema**: a qué módulos
accede, qué puede hacer en cada pantalla y en qué orden se realizan las tareas.

## Manuales disponibles

| Rol | Archivo |
|---|---|
| Super Administrador | [manual-super-admin.md](manual-super-admin.md) |
| Administrador | [manual-admin.md](manual-admin.md) |
| Digitador | [manual-digitador.md](manual-digitador.md) |
| Funcionario | [manual-funcionario.md](manual-funcionario.md) |
| Contratista | [manual-contratista.md](manual-contratista.md) |
| Supervisor de Contratos | [manual-supervisor-contratos.md](manual-supervisor-contratos.md) |

## Cómo agregar las capturas de pantalla

Cada manual tiene marcadores del tipo:

```
📸 **[CAPTURA 1: descripción de la pantalla]**
```

Para completar el manual:

1. Inicia sesión con un usuario de ese rol (`composer run dev` + `npm run dev`, o el ambiente
   desplegado).
2. Navega a la pantalla descrita en el marcador y toma la captura.
3. Reemplaza el marcador por la imagen, por ejemplo:
   ```markdown
   ![Login](capturas/super-admin/01-login.png)
   ```
4. Guarda las imágenes en una subcarpeta `capturas/<rol>/` dentro de esta misma carpeta
   (`docs/manuales-usuario/capturas/super-admin/`, etc.) numeradas en el orden en que
   aparecen en el manual, para que sea fácil relacionarlas con el texto.

No es necesario capturar cada botón — basta con una captura por pantalla/flujo principal
(la vista completa, un modal abierto, un formulario lleno). Los marcadores ya indican
exactamente qué debe mostrar cada captura.
