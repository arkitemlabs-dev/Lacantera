---
trigger: always_on
---

# Workspace Rules - Portal de Proveedores La Cantera

## 1. Cómo debe trabajar el agente en este repo

- Antes de hacer cambios grandes, leer y tener en cuenta el archivo `CLAUDE.md` del proyecto.
- Siempre proponer primero un plan corto (pasos numerados) antes de editar muchos archivos o tocar flujos críticos (login, carga de facturas, pagos).
- Usar el modo iterativo de trabajo: plan → cambios pequeños → verificación (revisar errores en consola, logs y build) → ajustes.
- Nunca borrar código legacy (especialmente integración ERP o auth) sin explicarlo y proponer una alternativa compatible.

## 2. Stack y convenciones de este workspace

- Este proyecto usa Next.js 15 (App Router) con React 18, TypeScript, Tailwind y Radix UI/shadcn; no introducir otros frameworks de frontend.
- Respetar la organización de carpetas existente:
  - `src/components/` para componentes reutilizables.
  - `src/lib/` para lógica compartida (auth, DB, SAT, email, storage, jobs).
  - `src/contexts/`, `src/hooks/`, `src/types/` para contextos, hooks y tipos.
- Usar solo Blob Storage para archivos (XML, PDF, documentos de cumplimiento) a través de los helpers existentes en `src/lib` (no usar filesystem local).
- Mantener las respuestas de API en el formato `{ success: true, data }` / `{ success: false, error }`.

## 3. Reglas para backend (API, DB, ERP)

- Para acceder a SQL Server y ERP:
  - Usar siempre los helpers de `src/lib/database/*` y los stored procedures definidos, no escribir SQL ad-hoc desde rutas API.
  - Respetar el modelo multi-tenant usando el parámetro de empresa y las utilidades existentes para determinar la empresa activa.
- Al crear nuevos endpoints:
  - Colocarlos bajo `/api/admin/*`, `/api/proveedor/*` o `/api/erp/*` según corresponda.
  - Incluir validación de entrada y manejo de errores consistente.
- Cualquier cambio relacionado con facturas, órdenes de compra, pagos o proveedores debe mantener la compatibilidad con los SPs listados en `CLAUDE.md`.

## 4. Reglas para frontend (UI/UX)

- Reutilizar componentes de UI existentes antes de crear nuevos; si se crea un componente nuevo, ubicarlo en `src/components/` siguiendo el estilo del proyecto.
- Formularios:
  - Mostrar mensajes de error claros en español.
  - Validar tanto en cliente como en servidor para operaciones críticas (login, facturación, alta/edición de proveedor).
- Para vistas de proveedores, usar rutas bajo `/proveedores/*`; para admins, usar `/dashboard`, `/proveedores`, `/facturas`, etc., tal como se describe en `CLAUDE.md`.
- Mantener la interfaz responsive; evitar cambios radicales en el layout sin justificación.

## 5. Seguridad y datos sensibles

- No exponer en el frontend datos sensibles de otros proveedores o empresas; siempre verificar autorización en backend.
- Manejar contraseñas y credenciales solo a través de NextAuth y los flujos definidos en `src/lib/auth.config.ts`.
- Al tocar funciones de subida de archivos:
  - Verificar tipo y tamaño, subir exclusivamente a Blob Storage, almacenar solo la referencia en la BD.
- No loguear en consola ni en logs de servidor datos sensibles (contraseñas, tokens, datos bancarios, RFC completo, etc.).

## 6. Artefactos y documentación dentro del workspace

- Usar los artefactos de Antigravity (task, implementation_plan, walkthrough) para:
  - Documentar el impacto de cambios en módulos críticos (auth, facturación, pagos, integración ERP).
  - Incluir siempre una breve sección de “Riesgos y consideraciones” cuando se modifique algo relacionado con facturas o pagos.
- Cuando se añadan módulos nuevos o endpoints importantes, actualizar `CLAUDE.md` o crear la documentación correspondiente en `docs/` manteniendo el mismo estilo.