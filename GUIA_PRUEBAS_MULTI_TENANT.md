# 🧪 Guía de Pruebas - Multi-Tenant en Acción

**Aplicación corriendo en:** http://localhost:3000

---

## ✅ Paso 1: Ejecutar Script SQL (Si aún no lo hiciste)

1. Abre **SQL Server Management Studio** o **Azure Data Studio**
2. Conecta a la BD **PP**
3. Ejecuta el contenido de `scripts/crear-mappings-manual.sql`
4. Verifica que veas: **✅ Total de mappings creados: 5**

---

## 🔐 Paso 2: Hacer Login

### 2.1 Ir a la página de login

```
http://localhost:3000/login
```

### 2.2 Credenciales de prueba

```
Email:    proveedor@test.com
Password: [el que esté configurado en pNetUsuarioPassword]
```

> **Nota:** Si no conoces el password, ejecuta esta query en SQL:
> ```sql
> SELECT * FROM pNetUsuarioPassword WHERE IDUsuario = 3;
> ```

### 2.3 Resultado Esperado

✅ Login exitoso
✅ Redirige al dashboard
✅ **En el header deberías ver un selector de empresas**

---

## 🏢 Paso 3: Verificar Selector de Empresas

### 3.1 Buscar el selector en el header

Deberías ver algo como:

```
┌──────────────────────────────────────────────┐
│  🏢 La Cantera Desarrollos Mineros    ▼     │
└──────────────────────────────────────────────┘
```

### 3.2 Hacer click en el selector

Deberías ver un dropdown con **5 empresas:**

```
Seleccionar Empresa
──────────────────────────────────────
🏢 La Cantera Desarrollos Mineros    ✓
   Código: LCDM
   Proveedor: PROV001

🏢 Peralillo S.A de C.V
   Código: PERA
   Proveedor: PROV001

🏢 Plaza Galereña
   Código: PLAZ
   Proveedor: PROV001

🏢 Icrear
   Código: ICRE
   Proveedor: PROV001

🏢 Inmobiliaria Galereña
   Código: INMO
   Proveedor: PROV001
```

✅ Si ves las 5 empresas, **el multi-tenant está funcionando correctamente**

---

## 🔍 Paso 4: Verificar Session JWT

### 4.1 Abrir DevTools

Presiona **F12** y ve a la pestaña **Console**

### 4.2 Ejecutar este código:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('=== SESSION DATA ===');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Empresa Actual:', data.user.empresaActual);
    console.log('Total Empresas:', data.user.empresasDisponibles.length);
    console.log('\n=== EMPRESAS DISPONIBLES ===');
    data.user.empresasDisponibles.forEach((e, i) => {
      console.log(`${i+1}. ${e.tenantName} (${e.empresaCodigo})`);
    });
    return data;
  });
```

### 4.3 Resultado Esperado:

```
=== SESSION DATA ===
User ID: 3
Email: proveedor@test.com
Empresa Actual: la-cantera
Total Empresas: 5

=== EMPRESAS DISPONIBLES ===
1. La Cantera Desarrollos Mineros (LCDM)
2. Peralillo S.A de C.V (PERA)
3. Plaza Galereña (PLAZ)
4. Icrear (ICRE)
5. Inmobiliaria Galereña (INMO)
```

✅ Si ves esto, **el JWT contiene los datos correctos**

---

## 🧪 Paso 5: Probar API de Notificaciones

### 5.1 Ejecutar en Console:

```javascript
fetch('/api/notificaciones?noLeidas=true')
  .then(r => r.json())
  .then(data => {
    console.log('=== API NOTIFICACIONES ===');
    console.log('Success:', data.success);
    console.log('Total:', data.total);
    console.log('Empresa:', data.tenant.empresa);
    console.log('Código:', data.tenant.codigo);
    console.log('Notificaciones:', data.notificaciones);
    return data;
  });
```

### 5.2 Resultado Esperado:

```json
{
  "success": true,
  "notificaciones": [...],  // Puede estar vacío
  "total": 0,
  "tenant": {
    "empresa": "La Cantera Desarrollos Mineros",
    "codigo": "LCDM"  // ← Importante: está usando la empresa actual
  }
}
```

✅ **Lo importante es que `tenant.codigo` sea "LCDM"** (la empresa actual)

---

## 🔄 Paso 6: Cambiar de Empresa y Verificar Filtrado

### 6.1 Cambiar a Peralillo

1. Click en el selector de empresas
2. Seleccionar **"Peralillo S.A de C.V"**
3. Verás un overlay: **"Cambiando empresa..."**
4. La página se recarga automáticamente
5. El selector ahora muestra **"Peralillo S.A de C.V"**

### 6.2 Volver a probar la API

```javascript
fetch('/api/notificaciones?noLeidas=true')
  .then(r => r.json())
  .then(data => {
    console.log('=== DESPUÉS DE CAMBIAR EMPRESA ===');
    console.log('Empresa:', data.tenant.empresa);
    console.log('Código:', data.tenant.codigo);  // ← Debería ser "PERA" ahora
    return data;
  });
```

### 6.3 Resultado Esperado:

```json
{
  "success": true,
  "tenant": {
    "empresa": "Peralillo S.A de C.V",
    "codigo": "PERA"  // ← ✅ CAMBIÓ de LCDM a PERA
  }
}
```

✅ **Si el código cambió de "LCDM" a "PERA", el filtrado multi-tenant está funcionando**

---

## 🧪 Paso 7: Probar Otras APIs Migradas

### 7.1 API de Mensajes

```javascript
fetch('/api/mensajes')
  .then(r => r.json())
  .then(data => {
    console.log('=== API MENSAJES ===');
    console.log('Success:', data.success);
    console.log('Total conversaciones:', data.total);
    console.log('Empresa:', data.tenant.empresa);
    console.log('Código:', data.tenant.codigo);
    return data;
  });
```

**Esperado:** `tenant.codigo` debe coincidir con la empresa seleccionada en el selector

### 7.2 API de Documentos

```javascript
fetch('/api/proveedores/documentos')
  .then(r => r.json())
  .then(data => {
    console.log('=== API DOCUMENTOS ===');
    console.log('Success:', data.success);
    console.log('Total documentos:', data.total);
    console.log('Empresa:', data.tenant.empresa);
    console.log('Código:', data.tenant.codigo);
    console.log('Proveedor:', data.tenant.proveedor);
    return data;
  });
```

**Esperado:**
- `tenant.codigo` = Empresa actual
- `tenant.proveedor` = "PROV001"

### 7.3 API de Órdenes de Compra

```javascript
fetch('/api/ordenes-compra-hybrid?limit=10')
  .then(r => r.json())
  .then(data => {
    console.log('=== API ÓRDENES ===');
    console.log('Success:', data.success);
    console.log('Total órdenes:', data.data.total);
    console.log('Empresa:', data.data.tenant.nombre);
    console.log('Código:', data.data.tenant.empresa);
    console.log('BD ERP:', data.metadata.erpDatabase);
    return data;
  });
```

**Esperado:**
- `tenant.empresa` = Código de empresa actual
- `metadata.erpDatabase` = Base de datos del ERP correspondiente

---

## 🔬 Paso 8: Test Completo de Cambio de Empresa

### 8.1 Script Automatizado

Ejecuta este script en la consola para probar todas las empresas:

```javascript
async function testMultiTenant() {
  console.log('🧪 INICIANDO TEST MULTI-TENANT\n');

  // Obtener session actual
  const session = await fetch('/api/auth/session').then(r => r.json());
  console.log('📊 Total empresas disponibles:', session.user.empresasDisponibles.length);
  console.log('🏢 Empresa actual:', session.user.empresaActual);

  // Probar API con empresa actual
  const notif = await fetch('/api/notificaciones').then(r => r.json());
  console.log('\n✅ API Notificaciones:');
  console.log('   Empresa:', notif.tenant?.empresa);
  console.log('   Código:', notif.tenant?.codigo);

  const msg = await fetch('/api/mensajes').then(r => r.json());
  console.log('\n✅ API Mensajes:');
  console.log('   Empresa:', msg.tenant?.empresa);
  console.log('   Código:', msg.tenant?.codigo);

  const docs = await fetch('/api/proveedores/documentos').then(r => r.json());
  console.log('\n✅ API Documentos:');
  console.log('   Empresa:', docs.tenant?.empresa);
  console.log('   Código:', docs.tenant?.codigo);
  console.log('   Proveedor:', docs.tenant?.proveedor);

  console.log('\n🎉 TEST COMPLETADO');
  console.log('💡 Ahora cambia de empresa y ejecuta este script de nuevo');
}

testMultiTenant();
```

### 8.2 Pasos del Test:

1. **Ejecuta el script con "La Cantera"** (empresa por defecto)
2. **Anota los códigos** que aparecen (debería ser "LCDM")
3. **Cambia a "Peralillo"** usando el selector
4. **Ejecuta el script de nuevo**
5. **Verifica que los códigos cambiaron** a "PERA"
6. **Repite con las otras 3 empresas**

### 8.3 Tabla de Verificación:

| Empresa | Código Esperado | API Notif | API Mensajes | API Docs |
|---------|----------------|-----------|--------------|----------|
| La Cantera | LCDM | ☐ | ☐ | ☐ |
| Peralillo | PERA | ☐ | ☐ | ☐ |
| Plaza Galereña | PLAZ | ☐ | ☐ | ☐ |
| Icrear | ICRE | ☐ | ☐ | ☐ |
| Inmobiliaria | INMO | ☐ | ☐ | ☐ |

✅ **Si todas las APIs devuelven el código correcto para cada empresa, el multi-tenant está 100% funcional**

---

## 🐛 Troubleshooting

### Problema 1: No veo el selector de empresas

**Posibles causas:**
- Mappings no creados → Ejecuta `crear-mappings-manual.sql`
- JWT no actualizado → Cierra sesión y vuelve a login
- Componente no renderizado → Verifica que esté en el layout

**Solución:**
```javascript
// Verificar session
fetch('/api/auth/session').then(r => r.json()).then(console.log);

// Si empresasDisponibles está vacío, ejecuta el SQL script
```

### Problema 2: APIs devuelven error 401

**Causa:** Sesión no válida

**Solución:**
1. Cierra sesión
2. Vuelve a hacer login
3. Prueba de nuevo

### Problema 3: Código de empresa no cambia al cambiar de empresa

**Causa:** Caché del navegador

**Solución:**
1. Abre DevTools
2. Ve a **Application** → **Storage**
3. Click en **Clear site data**
4. Recarga la página
5. Login de nuevo

### Problema 4: Error "No mapeado a proveedor"

**Causa:** El mapping no tiene `proveedorCodigo`

**Solución:**
```sql
-- Verificar mappings
SELECT * FROM portal_proveedor_mapping WHERE portal_user_id = '3';

-- Actualizar si es necesario
UPDATE portal_proveedor_mapping
SET erp_proveedor_code = 'PROV001'
WHERE portal_user_id = '3' AND erp_proveedor_code IS NULL;
```

---

## ✅ Checklist Final

Después de las pruebas, verifica:

- [ ] Puedo hacer login con `proveedor@test.com`
- [ ] Veo el selector de empresas con 5 opciones
- [ ] Puedo cambiar entre empresas sin errores
- [ ] JWT contiene `empresaActual` y `empresasDisponibles`
- [ ] API `/api/notificaciones` filtra por empresa actual
- [ ] API `/api/mensajes` filtra por empresa actual
- [ ] API `/api/proveedores/documentos` filtra por empresa actual
- [ ] Al cambiar empresa, el código en las APIs cambia correctamente
- [ ] No veo datos de otras empresas en ninguna API

---

## 🎉 Si Todas las Pruebas Pasan

**¡Felicitaciones!** El sistema multi-tenant está funcionando correctamente:

✅ Autenticación con NextAuth
✅ JWT con información de empresas
✅ Selector de empresas en UI
✅ Cambio de empresa con recarga
✅ APIs filtradas por empresa automáticamente
✅ Seguridad: No se pueden ver datos de otras empresas

**Próximos pasos:**
1. Migrar las rutas restantes (facturas, catálogos, etc.)
2. Probar con usuarios reales
3. Verificar performance con datos reales
4. Agregar tests automatizados

---

**¿Problemas?** Revisa los logs del servidor en la terminal donde corre `npm run dev`
