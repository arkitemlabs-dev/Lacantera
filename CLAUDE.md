# Portal de Proveedores - La Cantera

## Visión General
Aplicación web full-stack para gestionar la relación con proveedores de un grupo de 5 empresas. Administradores gestionan proveedores, órdenes de compra, facturas y pagos. Proveedores suben facturas, consultan órdenes y dan seguimiento a pagos.

## Tecnologías
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, Server Components) |
| Frontend | React 18, TypeScript, Tailwind CSS, Radix UI/shadcn |
| Auth | NextAuth 4 (Credentials Provider + bcrypt) |
| BD Principal | SQL Server (`PP` para auth, `Cantera`/`Cantera_Ajustes` para ERP) |
| Almacenamiento | Azure Blob Storage (XMLs, PDFs) — `@azure/storage-blob` |
| Email | Nodemailer (SMTP) |
| Validación SAT | SOAP client para CFDI |
| Gráficas | Recharts |
| Jobs | node-cron |

## Arquitectura Multi-Tenant
10 empresas (5 producción + 5 test). Los Stored Procedures reciben `@Empresa` (01-10) y enrutan internamente.

| Código | Empresa |
|--------|---------|
| 01 | La Cantera Desarrollos Mineros (LCDM) |
| 02 | El Peralillo SA de CV (PERA) |
| 03 | Plaza Galereña (PLAZ) |
| 04 | Inmobiliaria Galereña (INMO) |
| 05 | Icrear (ICRE) |
| 06-10 | Mismas 5 en modo TEST |

## Flujo de Comunicación
```
Browser → Next.js (React) → API Routes / Server Actions → Stored Procedures → SQL Server
                                                        → Azure Blob Storage (archivos)
                                                        → Nodemailer (emails)
                                                        → SOAP SAT (validación CFDI)
```

## Autenticación
1. Login con email + password + tipo usuario (Admin/Proveedor)
2. Búsqueda en 2 tablas: `WebUsuario` (moderna) → fallback `pNetUsuario` (legacy)
3. Passwords con bcrypt, sesión con NextAuth (JWT en cookies HTTP-only)
4. Roles: `super-admin`, `admin`, `proveedor`
5. Redirect: proveedores → `/proveedores/dashboard`, admins → `/dashboard`

## Módulos Admin
| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPIs, gráficas, actividad reciente |
| Proveedores | `/proveedores` | CRUD proveedores, documentos, sync ERP |
| Órdenes de Compra | `/ordenes-de-compra` | Listado/detalle OC vía SPs |
| Facturas | `/facturas` | Aprobar/rechazar, descarga XML/PDF |
| Pagos | `/pagos` | Seguimiento de pagos |
| Mensajería | `/mensajeria` | Comunicación con proveedores |
| Notificaciones | `/notificaciones` | Alertas con SSE en tiempo real |
| Configuración | `/configuracion` | Ajustes, logo, email |
| Usuarios | `/admin/usuarios` | Gestión usuarios admin |

## Módulos Proveedor
| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/proveedores/dashboard` | Métricas, acciones pendientes |
| Órdenes | `/proveedores/ordenes-de-compra` | Ver OC asignadas |
| Facturación | `/proveedores/facturacion` | Subir XML/PDF, vincular a OC |
| Documentos | `/proveedores/documentos` | Documentos de cumplimiento |
| Pagos | `/proveedores/pagos` | Estado de pagos |
| Mensajería | `/proveedores/mensajeria` | Recibir/responder mensajes |
| Perfil | `/proveedores/perfil` | Datos, info bancaria |
| Seguridad | `/proveedores/seguridad` | Cambiar password/email |

## Stored Procedures Clave
| SP | Función |
|----|---------|
| `sp_GetOrdenesCompra` | Listar OC por RFC/empresa |
| `sp_GetOrdenCompraConDetalle` | Detalle OC con partidas |
| `sp_GetFacturas` | Listar facturas (admin) |
| `sp_GetFacturasProveedor` | Facturas por proveedor |
| `sp_ValidarFacturaDuplicada` | Verificar UUID duplicado |
| `spDatosProveedor` | CRUD proveedor (C=Consulta, A=Alta, M=Modificación) |
| `spGeneraRemisionCompra` | Generar remisión de compra |
| `sp_getProveedores` | Listar todos los proveedores |

## API Endpoints (~70+)
- **Auth**: `/api/auth/*` — login, registro, recuperación password
- **Proveedor**: `/api/proveedor/*` — facturas, órdenes, pagos, documentos
- **Admin**: `/api/admin/*` — proveedores, facturas, órdenes, usuarios
- **ERP**: `/api/erp/*` — búsqueda RFC, sincronización, diagnóstico
- **Utilidades**: `/api/jobs/run`, `/api/test-db`, `/api/test-email`, `/api/facturas/validar-sat`

## Archivos Clave
| Archivo | Propósito |
|---------|-----------|
| `src/lib/auth.config.ts` | Configuración NextAuth |
| `src/lib/database/multi-tenant-connection.ts` | Pools conexión multi-tenant |
| `src/lib/database/stored-procedures.ts` | Wrapper de todos los SPs |
| `src/lib/database/tenant-configs.ts` | Mapeo de empresas |
| `src/lib/email-service.ts` | Servicio de email |
| `src/lib/sat-validator.ts` | Validación CFDI ante SAT |
| `src/lib/blob-storage.ts` | Azure Blob Storage (upload, download, SAS URLs, delete) |
| `src/lib/blob-path-builder.ts` | Constructor de rutas multi-tenant para blobs |
| `src/lib/jobs/scheduler.ts` | Jobs programados (cron) |

## Patrones de Código
- API Routes (`/api/*`) + Server Actions (`/app/actions/*`) para backend
- Respuestas estándar: `{ success: true, data }` / `{ success: false, error }`
- Archivos en Azure Blob Storage, referencias en SQL Server
- Componentes UI en `src/components/` (shadcn + custom)
- Contextos React en `src/contexts/` (auth, empresa)
- Hooks custom en `src/hooks/`
- Tipos TypeScript en `src/types/`
