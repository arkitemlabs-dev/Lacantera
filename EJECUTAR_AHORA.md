# 🚀 EJECUTAR AHORA - Crear Mappings

## ✅ Ya tenemos los datos necesarios

Del diagnóstico obtuvimos:
- **IDUsuario:** 3
- **Usuario:** PROV001
- **Email:** proveedor@test.com
- **Tipo:** Proveedor (tipo 4)
- **Estado:** ACTIVO
- **Password:** ✅ SÍ tiene

---

## 📝 Paso 1: Ejecutar Script de Mappings

1. Abre **SQL Server Management Studio** o **Azure Data Studio**
2. Conecta a la base de datos **PP**
3. Abre el archivo: `scripts/crear-mappings-manual.sql`
4. **Ejecuta el script completo** (ya está configurado con el usuario correcto)

### Resultado Esperado:

```
============================================================
CREANDO MAPPINGS PARA USUARIO: 3
CÓDIGO PROVEEDOR: PROV001
============================================================

🧹 Mappings anteriores eliminados (si existían)

✅ Mapping 1 creado: La Cantera (LCDM)
✅ Mapping 2 creado: Peralillo (PERA)
✅ Mapping 3 creado: Plaza Galereña (PLAZ)

============================================================
RESUMEN DE MAPPINGS CREADOS
============================================================

ID Usuario  Email                    Nombre                      Código Proveedor  Empresa  Activo
3           proveedor@test.com       Usuario Proveedor Prueba    PROV001           LCDM     1
3           proveedor@test.com       Usuario Proveedor Prueba    PROV001           PERA     1
3           proveedor@test.com       Usuario Proveedor Prueba    PROV001           PLAZ     1

✅ Total de mappings creados: 3
```

---

## 📝 Paso 2: Verificar que Funcionó

Ejecuta esta query para confirmar:

```sql
USE PP;
GO

SELECT
    m.portal_user_id,
    u.eMail,
    u.Nombre,
    m.erp_proveedor_code,
    m.empresa_code,
    m.activo
FROM portal_proveedor_mapping m
INNER JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
WHERE m.portal_user_id = '3';
```

Deberías ver **3 filas** (una por cada empresa).

---

## 📝 Paso 3: Probar el Login

### 3.1 Iniciar la aplicación

```bash
cd "c:\Users\Viviana Diaz\Documents\Trabajo Arkitem\CANTERA\App web\Lacantera"
npm run dev
```

### 3.2 Abrir navegador

```
http://localhost:3000/login
```

### 3.3 Credenciales de prueba

```
Email:    proveedor@test.com
Password: [el que esté configurado para este usuario]
```

> **Nota:** Si no recuerdas el password, ejecuta esta query para verificar:

```sql
SELECT
    u.IDUsuario,
    u.eMail,
    u.Usuario,
    CASE WHEN p.PasswordHash IS NOT NULL THEN 'Tiene password' ELSE 'Sin password' END
FROM pNetUsuario u
LEFT JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
WHERE u.IDUsuario = 3;
```

---

## ✅ Resultado Esperado Después del Login

### En el Header deberías ver:

```
┌────────────────────────────────────────────────┐
│  🏢 La Cantera Desarrollos Mineros    ▼       │
└────────────────────────────────────────────────┘
```

### Al hacer click en el selector:

```
Seleccionar Empresa
─────────────────────────────────────────
🏢 La Cantera Desarrollos Mineros      ✓
   Código: LCDM
   Proveedor: PROV001

🏢 Peralillo S.A de C.V
   Código: PERA
   Proveedor: PROV001

🏢 Plaza Galereña
   Código: PLAZ
   Proveedor: PROV001
```

---

## 🚨 Si el Login Falla

### Error: "Invalid credentials"

**Opción 1: Verificar password existente**

```sql
SELECT PasswordHash
FROM pNetUsuarioPassword
WHERE IDUsuario = 3;
```

**Opción 2: Crear un nuevo password de prueba**

Si no existe o quieres cambiarlo:

```sql
USE PP;
GO

-- Eliminar password anterior si existe
DELETE FROM pNetUsuarioPassword WHERE IDUsuario = 3;

-- Crear nuevo password: "Test123!"
INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash, FechaCreacion)
VALUES (
    3,
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    GETDATE()
);
```

Luego intenta login con:
- Email: `proveedor@test.com`
- Password: `Test123!`

---

## 🎯 Siguiente Paso Después de Login Exitoso

Una vez que puedas:
1. ✅ Hacer login
2. ✅ Ver el selector de empresas
3. ✅ Cambiar entre empresas

Entonces podrás empezar a **migrar tus rutas existentes** usando los helpers multi-tenant.

Ver: [MIGRATION_EXAMPLES.md](docs/MIGRATION_EXAMPLES.md)

---

**¡Ejecuta el script ahora! →** `scripts/crear-mappings-manual.sql`
