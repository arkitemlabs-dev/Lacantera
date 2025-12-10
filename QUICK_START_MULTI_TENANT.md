# ⚡ Quick Start - Multi-Tenant Configuration

## 🎯 Tu Siguiente Acción AHORA

### 1. Ejecuta el Diagnóstico
```bash
# En SQL Server Management Studio o Azure Data Studio
# Conecta a la BD: PP
# Abre y ejecuta:
scripts/diagnostico-completo.sql
```

### 2. Anota Esta Información

Después de ejecutar el diagnóstico, completa:

```
IDUsuario elegido:        _____________
Email del usuario:        _____________
Código de Proveedor ERP:  _____________
```

### 3. Edita el Script Manual

Abre: `scripts/crear-mappings-manual.sql`

Cambia las líneas 15 y 18:
```sql
DECLARE @userId NVARCHAR(50) = 'PONER_AQUI_TU_ID';
DECLARE @proveedorCode VARCHAR(10) = 'PONER_CODIGO_PROVEEDOR';
```

### 4. Ejecuta el Script Manual

En la misma ventana SQL, ejecuta el script editado.

**Deberías ver:**
```
✅ Mapping 1 creado: La Cantera (LCDM)
✅ Mapping 2 creado: Peralillo (PERA)
✅ Mapping 3 creado: Plaza Galereña (PLAZ)
✅ Total de mappings creados: 3
```

### 5. Verifica Password

```sql
SELECT * FROM pNetUsuarioPassword WHERE IDUsuario = TU_ID_USUARIO;
```

Si está vacío, ejecuta:
```sql
-- Password: "Test123!"
INSERT INTO pNetUsuarioPassword (IDUsuario, Password, FechaCreacion)
VALUES (
    TU_ID_USUARIO,
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    GETDATE()
);
```

### 6. Inicia la App

```bash
npm run dev
```

### 7. Prueba el Login

```
URL:      http://localhost:3000/login
Email:    [el del usuario]
Password: Test123!  (o el que configuraste)
```

### ✅ Resultado Esperado

Deberías ver en el header un selector con 3 empresas:
- 🏢 La Cantera Desarrollos Mineros
- 🏢 Peralillo S.A de C.V
- 🏢 Plaza Galereña

---

## 📋 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `scripts/diagnostico-completo.sql` | Identifica usuarios y datos disponibles |
| `scripts/crear-mappings-manual.sql` | Crea mappings manualmente |
| `docs/PASOS_SIGUIENTE_CONFIGURACION.md` | Guía detallada paso a paso |
| `docs/TESTING_MULTI_TENANT.md` | Guía de testing completa |

---

## 🚨 Si Algo Falla

1. **No veo empresas en el selector**
   - Verifica: `SELECT * FROM portal_proveedor_mapping`
   - Debería tener 3 filas

2. **Login falla**
   - Verifica password en `pNetUsuarioPassword`
   - Verifica `Estatus = 'ACTIVO'` en `pNetUsuario`

3. **Error de base de datos**
   - Revisa `.env.local` (credenciales de BD)
   - Verifica que las BDs existen en SQL Server

---

## 📞 Documentación Completa

Lee el archivo completo: [PASOS_SIGUIENTE_CONFIGURACION.md](docs/PASOS_SIGUIENTE_CONFIGURACION.md)

---

**¿Listo? Ejecuta el diagnóstico ahora →** `scripts/diagnostico-completo.sql`
