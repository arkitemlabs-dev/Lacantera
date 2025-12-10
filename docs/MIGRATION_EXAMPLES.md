# 🔄 Ejemplos de Migración a Multi-Tenant

Esta guía muestra cómo migrar rutas existentes para usar el nuevo sistema multi-tenant.

---

## 📋 Patrones de Migración

### Patrón 1: API Route Simple

**ANTES:**
```typescript
// src/app/api/ordenes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getConnection } from '@/lib/sql-connection';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getConnection();
  const result = await pool.request()
    .input('proveedor', sql.VarChar, session.user.proveedor)
    .query(`
      SELECT * FROM Compra
      WHERE Proveedor = @proveedor
      ORDER BY Fecha DESC
    `);

  return NextResponse.json({ ordenes: result.recordset });
}
```

**DESPUÉS:**
```typescript
// src/app/api/ordenes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { getOrdenesCompraHybrid } from '@/lib/database/hybrid-queries';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  // ✅ tenant y user ya validados
  // ✅ tenant.proveedorCodigo disponible
  // ✅ tenant.tenantId identifica la empresa
  // ✅ tenant.empresaCodigo es el código en el ERP

  const ordenes = await getOrdenesCompraHybrid(
    tenant.tenantId,
    tenant.proveedorCodigo!,
    { limit: 50 }
  );

  return NextResponse.json({
    success: true,
    data: ordenes,
    tenant: tenant.tenantName,
  });
});
```

**Beneficios:**
- ✅ Menos código repetitivo
- ✅ Validación automática de tenant
- ✅ Queries híbridas (ERP + Portal)
- ✅ Manejo de errores centralizado

---

### Patrón 2: API Route con Parámetros

**ANTES:**
```typescript
// src/app/api/ordenes/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await getConnection();
  const result = await pool.request()
    .input('id', sql.Int, params.id)
    .input('proveedor', sql.VarChar, session.user.proveedor)
    .query(`
      SELECT * FROM Compra
      WHERE ID = @id AND Proveedor = @proveedor
    `);

  if (!result.recordset.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ orden: result.recordset[0] });
}
```

**DESPUÉS:**
```typescript
// src/app/api/ordenes/[id]/route.ts
import { withTenantContext } from '@/middleware/tenant';
import { getOrdenCompraDetalle } from '@/lib/database/hybrid-queries';

export async function GET_BY_ID(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(async (req, { tenant, user }) => {
    const ordenId = parseInt(params.id);

    if (isNaN(ordenId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const detalle = await getOrdenCompraDetalle(tenant.tenantId, ordenId);

    if (!detalle) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Validar acceso
    if (detalle.encabezado.Proveedor !== tenant.proveedorCodigo) {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: detalle });
  })(request, { params });
}
```

---

### Patrón 3: POST con Validación

**ANTES:**
```typescript
// src/app/api/ordenes/[id]/responder/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { status, observaciones } = body;

  // Validar input
  if (!['aceptada', 'rechazada'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const pool = await getConnection();

  // Verificar que la orden pertenece al proveedor
  const check = await pool.request()
    .input('id', sql.Int, params.id)
    .input('proveedor', sql.VarChar, session.user.proveedor)
    .query('SELECT COUNT(*) as count FROM Compra WHERE ID = @id AND Proveedor = @proveedor');

  if (check.recordset[0].count === 0) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }

  // Guardar respuesta
  await pool.request()
    .input('ordenId', sql.Int, params.id)
    .input('status', sql.VarChar, status)
    .input('obs', sql.NVarChar, observaciones)
    .input('userId', sql.UniqueIdentifier, session.user.id)
    .query(`
      INSERT INTO portal_orden_status (erp_orden_id, status_portal, observaciones, respondido_por)
      VALUES (@ordenId, @status, @obs, @userId)
    `);

  return NextResponse.json({ success: true });
}
```

**DESPUÉS:**
```typescript
// src/app/api/ordenes/[id]/responder/route.ts
import { withTenantContext } from '@/middleware/tenant';
import { updateOrdenStatus, getOrdenCompraDetalle } from '@/lib/database/hybrid-queries';

export async function POST_RESPONDER(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTenantContext(async (req, { tenant, user }) => {
    const ordenId = parseInt(params.id);
    const body = await req.json();
    const { status, observaciones } = body;

    // Validación simplificada
    if (!['aceptada', 'rechazada'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Verificar orden y acceso (todo en una query)
    const detalle = await getOrdenCompraDetalle(tenant.tenantId, ordenId);

    if (!detalle) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    if (detalle.encabezado.Proveedor !== tenant.proveedorCodigo) {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      );
    }

    // Actualizar (solo Portal, NO ERP)
    await updateOrdenStatus(tenant.tenantId, ordenId, {
      status_portal: status,
      observaciones_proveedor: observaciones,
      respondido_por: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Orden actualizada',
    });
  })(request, { params });
}
```

---

### Patrón 4: Server Component

**ANTES:**
```typescript
// src/app/ordenes/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { redirect } from 'next/navigation';
import { getConnection } from '@/lib/sql-connection';

export default async function OrdenesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const pool = await getConnection();
  const result = await pool.request()
    .input('proveedor', session.user.proveedor)
    .query('SELECT * FROM Compra WHERE Proveedor = @proveedor');

  const ordenes = result.recordset;

  return (
    <div>
      <h1>Órdenes de Compra</h1>
      {ordenes.map(orden => (
        <div key={orden.ID}>{orden.Folio}</div>
      ))}
    </div>
  );
}
```

**DESPUÉS - Opción 1: Usando API Route:**
```typescript
// src/app/ordenes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function OrdenesPage() {
  const { data: session } = useSession();
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrdenes() {
      try {
        const res = await fetch('/api/ordenes');
        const data = await res.json();
        setOrdenes(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchOrdenes();
    }
  }, [session]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Órdenes de Compra - {session?.user?.empresaActual}</h1>
      {ordenes.map(orden => (
        <div key={orden.orden_id}>{orden.numero_orden}</div>
      ))}
    </div>
  );
}
```

**DESPUÉS - Opción 2: Server Component con Helper:**
```typescript
// src/app/ordenes/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { redirect } from 'next/navigation';
import { getOrdenesCompraHybrid } from '@/lib/database/hybrid-queries';
import { createTenantContextFromSession } from '@/lib/database/tenant-context';

export default async function OrdenesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.empresaActual) {
    redirect('/select-empresa');
  }

  const tenantContext = createTenantContextFromSession(session);

  const ordenes = await getOrdenesCompraHybrid(
    session.user.empresaActual,
    tenantContext.proveedorCodigo!,
    { limit: 50 }
  );

  return (
    <div>
      <h1>Órdenes de Compra - {session.user.empresaActual}</h1>
      {ordenes.map(orden => (
        <div key={orden.orden_id}>
          <p>{orden.numero_orden}</p>
          <p>Estado Portal: {orden.status_portal}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎯 Checklist de Migración

Para cada ruta que migres, verifica:

### 1. Autenticación
- [ ] ¿Reemplazaste `getServerSession` con `withTenantContext`?
- [ ] ¿Eliminaste validación manual de sesión?
- [ ] ¿Usas `tenant` y `user` del contexto?

### 2. Queries
- [ ] ¿Usas helpers de `hybrid-queries.ts`?
- [ ] ¿Las queries incluyen filtro de empresa?
- [ ] ¿Las queries incluyen filtro de proveedor (si aplica)?
- [ ] ¿Separaste lectura (ERP) de escritura (Portal)?

### 3. Validaciones
- [ ] ¿Validaste acceso del usuario a los datos?
- [ ] ¿Validaste que la empresa sea correcta?
- [ ] ¿Manejaste errores apropiadamente?

### 4. Performance
- [ ] ¿Usas el pool de conexiones correcto?
- [ ] ¿Evitaste queries N+1?
- [ ] ¿Implementaste paginación si es necesario?

---

## 🚀 Migración Paso a Paso

### 1. Identificar Rutas a Migrar

```bash
# Buscar archivos que usan getConnection
grep -r "getConnection" src/app/api

# Buscar archivos con queries directas
grep -r "pool.request" src/app/api
```

### 2. Priorizar por Impacto

**Alta prioridad:**
- Rutas de consulta de datos sensibles
- Rutas con lógica de negocio compleja
- Rutas usadas frecuentemente

**Media prioridad:**
- Rutas de reportes
- Rutas administrativas

**Baja prioridad:**
- Rutas de utilidad
- Endpoints de testing

### 3. Migrar una por una

1. Leer la ruta actual
2. Identificar queries y lógica
3. Crear helper si no existe
4. Reescribir con `withTenantContext`
5. Probar exhaustivamente
6. Commit y desplegar

### 4. Verificar

```bash
# Después de migrar cada ruta
npm run build  # Verificar que compila
npm run dev    # Probar funcionalmente
```

---

## 📊 Ejemplo Completo: Migrar Notificaciones

### Archivo Original

```typescript
// src/app/api/notificaciones/route.ts (ANTES)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { database } from '@/lib/database';

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notificaciones = await database.getNotificacionesByUsuario(
    session.user.id
  );

  return NextResponse.json(notificaciones);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const id = await database.createNotificacion({
    usuarioId: session.user.id,
    tipo: body.tipo,
    mensaje: body.mensaje,
    leida: false,
  });

  return NextResponse.json({ id });
}
```

### Archivo Migrado

```typescript
// src/app/api/notificaciones/route.ts (DESPUÉS)
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { hybridDB } from '@/lib/database/multi-tenant-connection';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  // Notificaciones del Portal (no dependen de empresa)
  const result = await hybridDB.queryPortal(
    `
    SELECT
      id, tipo, mensaje, leida, created_at
    FROM portal_notificaciones
    WHERE usuario_id = @userId
    ORDER BY created_at DESC
    LIMIT 50
    `,
    { userId: user.id }
  );

  return NextResponse.json({
    success: true,
    data: result.recordset,
  });
});

export const POST = withTenantContext(async (request, { tenant, user }) => {
  const body = await request.json();
  const { tipo, mensaje } = body;

  // Validar
  if (!tipo || !mensaje) {
    return NextResponse.json(
      { error: 'tipo y mensaje requeridos' },
      { status: 400 }
    );
  }

  // Insertar en Portal
  const result = await hybridDB.queryPortal(
    `
    INSERT INTO portal_notificaciones (
      id, usuario_id, tipo, mensaje, leida, created_at
    )
    OUTPUT INSERTED.id
    VALUES (NEWID(), @userId, @tipo, @mensaje, 0, GETDATE())
    `,
    {
      userId: user.id,
      tipo,
      mensaje,
    }
  );

  return NextResponse.json({
    success: true,
    id: result.recordset[0].id,
  });
});
```

---

## 🎓 Tips y Mejores Prácticas

1. **No migres todo de golpe** - Hazlo gradualmente
2. **Prueba cada cambio** - No acumules migraciones sin probar
3. **Documenta cambios** - Anota qué se cambió y por qué
4. **Mantén backup** - Guarda la versión anterior comentada
5. **Usa helpers** - No dupliques lógica, crea funciones reutilizables
6. **Valida siempre** - Nunca confíes en datos del cliente

---

¿Necesitas ayuda con una ruta específica? Revisa los ejemplos o contacta al equipo.
