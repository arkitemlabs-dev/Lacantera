# Configuración Multiempresa

Esta guía explica cómo configurar y usar el sistema multiempresa en tu aplicación.

## 🏗️ Arquitectura Implementada

### Nuevas Colecciones en Firestore

1. **`empresas`** - Información de las empresas
   ```javascript
   {
     id: "auto-generated",
     codigo: "LCDM",
     razonSocial: "La Cantera Desarrollos Mineros S.A.S.",
     nombreComercial: "La Cantera",
     logo: "url_opcional",
     activa: true,
     fechaCreacion: "2024-01-01T00:00:00.000Z"
   }
   ```

2. **`usuarioEmpresas`** - Relación usuarios-empresas
   ```javascript
   {
     usuarioId: "user_uid",
     empresaId: "empresa_id",
     rol: "admin_super|admin_compras|proveedor",
     activo: true,
     fechaAsignacion: "2024-01-01T00:00:00.000Z"
   }
   ```

### Modificaciones en Colecciones Existentes

Todas las colecciones de datos ahora incluyen `empresaId`:
- `proveedores`
- `invoices` 
- `purchaseOrders`
- `payments`

## 🚀 Pasos de Implementación

### 1. Ejecutar Script de Inicialización

```bash
# Desde la raíz del proyecto
node scripts/init-multiempresa.js
```

Este script:
- Crea empresas de ejemplo
- Asigna usuarios existentes a empresas
- Actualiza documentos existentes con `empresaId`

### 2. Actualizar Reglas de Firestore

Las reglas ya están actualizadas en `firestore.rules`. Para aplicarlas:

```bash
firebase deploy --only firestore:rules
```

### 3. Usar en Componentes

#### Hook para Datos Filtrados por Empresa

```javascript
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { where, orderBy } from 'firebase/firestore';

function MiComponente() {
  const { obtenerDatos, crearDocumento } = useEmpresaData();
  
  // Obtener proveedores de la empresa actual
  const proveedores = await obtenerDatos('proveedores', [
    where('status', '==', 'active'),
    orderBy('name')
  ]);
  
  // Crear nuevo proveedor (automáticamente incluye empresaId)
  const nuevoProveedor = await crearDocumento('proveedores', {
    name: 'Nuevo Proveedor',
    email: 'contacto@proveedor.com'
  });
}
```

#### Contexto de Empresa

```javascript
import { useEmpresa } from '@/contexts/EmpresaContext';

function MiComponente() {
  const { empresaSeleccionada, empresasDisponibles } = useEmpresa();
  
  return (
    <div>
      <h1>Empresa: {empresaSeleccionada?.nombreComercial}</h1>
    </div>
  );
}
```

#### Proteger Componentes

```javascript
import { withEmpresaAuth } from '@/middleware/empresaAuth';

function ComponenteProtegido() {
  return <div>Solo usuarios con acceso a la empresa</div>;
}

export default withEmpresaAuth(ComponenteProtegido);
```

## 🔄 Flujo de Login Multiempresa

1. **Login Inicial**: Usuario ingresa credenciales y tipo de usuario
2. **Validación**: Se verifica que el tipo coincida con el rol en Firestore
3. **Selector de Empresa**: Se muestran las empresas disponibles para el usuario
4. **Selección**: Usuario elige empresa y se guarda en `sessionStorage`
5. **Redirección**: Se redirige al dashboard correspondiente

## 🎛️ Componentes Nuevos

### `EmpresaSelector`
- Muestra empresa actual en el header
- Permite cambiar de empresa
- Dropdown con empresas disponibles

### `EmpresaContext`
- Maneja estado global de empresa seleccionada
- Sincroniza con `sessionStorage`

### `useEmpresaData`
- Hook para consultas automáticamente filtradas por empresa
- Métodos CRUD que incluyen `empresaId`

## 🔒 Seguridad

### Reglas de Firestore
- Los usuarios solo pueden acceder a datos de empresas asignadas
- Verificación automática de permisos por empresa
- Administradores super pueden gestionar todas las empresas

### Validaciones Frontend
- Middleware que verifica acceso a empresa
- Redirección automática si no tiene permisos
- Limpieza de datos al cambiar empresa

## 📊 Gestión de Empresas

### Crear Nueva Empresa

```javascript
import { crearEmpresa } from '@/app/actions/empresas';

const nuevaEmpresa = await crearEmpresa({
  codigo: 'NUEVA',
  razonSocial: 'Nueva Empresa S.A.S.',
  nombreComercial: 'Nueva Empresa',
  activa: true
});
```

### Asignar Usuario a Empresa

```javascript
import { asignarUsuarioAEmpresa } from '@/app/actions/empresas';

await asignarUsuarioAEmpresa(
  'user_uid',
  'empresa_id', 
  'admin_compras'
);
```

## 🧪 Testing

### Datos de Prueba
El script crea automáticamente:
- La Cantera Desarrollos Mineros (LCDM)
- Arkitem Technologies (ARKITEM)

### Verificar Funcionamiento
1. Login con usuario existente
2. Verificar que aparezca selector de empresa
3. Seleccionar empresa y verificar datos filtrados
4. Cambiar empresa y verificar que los datos cambien

## 🚨 Consideraciones Importantes

1. **Migración de Datos**: Todos los datos existentes se asignan automáticamente a "La Cantera"
2. **Sesiones**: La empresa seleccionada se guarda en `sessionStorage`
3. **Logout**: Al cerrar sesión se limpia la empresa seleccionada
4. **Reglas Temporales**: Las reglas incluyen una regla temporal permisiva para desarrollo

## 🔧 Próximos Pasos

1. **Remover Regla Temporal**: En producción, eliminar la regla `allow read, write: if request.auth != null`
2. **Interfaz de Gestión**: Crear panel para administrar empresas y asignaciones
3. **Auditoría**: Implementar logs de cambios de empresa
4. **Optimización**: Cachear empresas disponibles del usuario