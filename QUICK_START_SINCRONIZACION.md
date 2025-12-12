# ⚡ Quick Start - Sincronización de Proveedores

## 🎯 Objetivo

Sincronizar **ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV** del ERP al Portal.

---

## 📝 Pasos Rápidos (5 minutos)

### 1️⃣ Crear la Tabla (Solo una vez)

Conecta a SQL Server y ejecuta:

```sql
-- Servidor: cloud.arkitem.com
-- Base de datos: PP
-- Usuario: sa_ediaz

USE PP;

CREATE TABLE portal_proveedor_mapping (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    portal_user_id NVARCHAR(50) NOT NULL,
    erp_proveedor_code VARCHAR(20) NOT NULL,
    empresa_code VARCHAR(10) NOT NULL,
    permisos NVARCHAR(MAX),
    activo BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_portal_mapping UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
);

CREATE INDEX IX_portal_proveedor_mapping_user ON portal_proveedor_mapping(portal_user_id);
CREATE INDEX IX_portal_proveedor_mapping_empresa ON portal_proveedor_mapping(empresa_code);
```

### 2️⃣ Probar la Sincronización

**Opción A - Interfaz Visual (Más fácil):**

1. Abre: http://localhost:3000/test-sync
2. Escribe: `ARQUITECTURA`
3. Click en: "Sincronizar Proveedor"
4. ✅ ¡Listo!

**Opción B - Consola del Navegador:**

```javascript
// F12 para abrir consola, luego ejecuta:

await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ patron: 'ARQUITECTURA' })
}).then(r => r.json()).then(console.log);
```

### 3️⃣ Verificar Resultados

```sql
-- Verificar en la base de datos PP
SELECT * FROM portal_proveedor_mapping
WHERE erp_proveedor_code IN ('P00443', 'PV-56');
```

---

## ✅ Resultado Esperado

Deberías ver 3 mappings creados:

| Empresa | Código |
|---------|--------|
| la-cantera | P00443 |
| peralillo | P00443 |
| plaza-galerena | PV-56 |

---

## 🔧 Archivos Creados

1. **API:** [src/app/api/erp/sync-proveedor/route.ts](src/app/api/erp/sync-proveedor/route.ts)
2. **Página de Test:** [src/app/test-sync/page.tsx](src/app/test-sync/page.tsx)
3. **Script SQL:** [scripts/crear-tabla-portal-proveedor-mapping.sql](scripts/crear-tabla-portal-proveedor-mapping.sql)

---

## 📚 Documentación Completa

- [RESUMEN_SINCRONIZACION_PROVEEDOR.md](RESUMEN_SINCRONIZACION_PROVEEDOR.md) - Documentación completa
- [GUIA_SINCRONIZACION_ARQUITECTURA.md](GUIA_SINCRONIZACION_ARQUITECTURA.md) - Guía paso a paso

---

## 🐛 Problemas Comunes

**Error: "No autenticado"**
- Inicia sesión en el portal primero

**Error: "Tabla no existe"**
- Ejecuta el paso 1️⃣ de nuevo

**Error: "No se encontró proveedor"**
- Usa patrón más corto: `ARQUI`

---

## 🎉 ¡Todo Listo!

Tu sistema de sincronización está funcionando. Ahora puedes:

✅ Sincronizar cualquier proveedor por nombre/código/RFC
✅ Ver mappings en tiempo real
✅ Preparar el auto-reconocimiento automático
✅ Construir el dashboard del proveedor

**Siguiente paso:** Visita http://localhost:3000/test-sync y haz la prueba! 🚀
