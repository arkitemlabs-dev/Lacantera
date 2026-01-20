'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MoreHorizontal,
  PlusCircle,
  Upload,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { navItems } from '../nav';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/app/providers';
import { initialRoles, type Role, type Permission } from '@/lib/roles';
import { toast } from '@/hooks/use-toast';

type User = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estatus: 'Activo' | 'Inactivo';
};

// Mapeo de roles de BD a nombres de display
const ROLES_DISPLAY: Record<string, string> = {
  'super-admin': 'Super Admin',
  'admin': 'Super Admin',
  'compras': 'Compras',
  'contabilidad': 'Contabilidad',
  'solo-lectura': 'Solo lectura',
};

// Roles disponibles para asignar
const ROLES_DISPONIBLES = [
  { value: 'super-admin', label: 'Super Admin' },
  { value: 'compras', label: 'Compras' },
  { value: 'contabilidad', label: 'Contabilidad' },
  { value: 'solo-lectura', label: 'Solo lectura' },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  Activo: 'default',
  Inactivo: 'secondary',
};

const availableModules = navItems.filter(item => item.href !== '/dashboard' && item.href !== '/perfil' && item.href !== '/configuracion');

// Roles predeterminados que no se pueden eliminar
const ROLES_PREDETERMINADOS = ['Super Admin', 'Compras', 'Contabilidad', 'Solo lectura'];

// Key para localStorage
const ROLES_STORAGE_KEY = 'portal_custom_roles';

export default function ConfiguracionPage() {
  const { userRole } = useAuth();
  const router = useRouter();

  // Estado de usuarios
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUser, setSavingUser] = useState(false);

  // Estado de roles (local + localStorage)
  const [roles, setRoles] = useState<Role[]>(() => {
    // Cargar roles base (sin Proveedor)
    const baseRoles = initialRoles.filter(r => r.name !== 'Proveedor');

    // Intentar cargar roles personalizados desde localStorage (solo en cliente)
    if (typeof window !== 'undefined') {
      try {
        const savedRoles = localStorage.getItem(ROLES_STORAGE_KEY);
        if (savedRoles) {
          const customRoles: Role[] = JSON.parse(savedRoles);
          // Combinar roles base con personalizados (evitar duplicados)
          const allRoles = [...baseRoles];
          customRoles.forEach(customRole => {
            if (!allRoles.find(r => r.name === customRole.name)) {
              allRoles.push(customRole);
            }
          });
          return allRoles;
        }
      } catch (e) {
        console.error('Error cargando roles desde localStorage:', e);
      }
    }
    return baseRoles;
  });

  // Estado para confirmar eliminación de rol
  const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Estado de diálogos
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [isToggleStatusAlertOpen, setIsToggleStatusAlertOpen] = useState(false);
  const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);

  // Estado de formularios
  const [newUserForm, setNewUserForm] = useState({ nombre: '', email: '', rol: '', contrasena: '' });
  const [editUserForm, setEditUserForm] = useState({ nombre: '', email: '' });
  const [changeRoleValue, setChangeRoleValue] = useState('');
  const [currentRolePermissions, setCurrentRolePermissions] = useState<Role['permissions']>({});
  const [currentRoleName, setCurrentRoleName] = useState('');

  useEffect(() => {
    if (userRole.name !== 'Super Admin') {
      router.push('/dashboard');
    } else {
      cargarUsuarios();
    }
  }, [userRole, router]);

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/usuarios');
      const result = await response.json();

      if (result.success) {
        setUsers(result.data);
      } else {
        toast({ title: 'Error', description: 'Error cargando usuarios: ' + result.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al cargar usuarios', variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  };

  if (userRole.name !== 'Super Admin') {
    return (
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Acceso Denegado</h1>
          <p>No tienes permiso para acceder a esta página.</p>
        </div>
      </main>
    );
  }

  const handleActionClick = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({ nombre: user.nombre, email: user.email });
    setChangeRoleValue(user.rol);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.nombre || !newUserForm.email || !newUserForm.rol || !newUserForm.contrasena) {
      toast({ title: 'Error', description: 'Todos los campos son requeridos', variant: 'destructive' });
      return;
    }

    setSavingUser(true);
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Éxito', description: 'Usuario creado correctamente' });
        setIsNewUserDialogOpen(false);
        setNewUserForm({ nombre: '', email: '', rol: '', contrasena: '' });
        cargarUsuarios();
      } else {
        toast({ title: 'Error', description: result.error || 'Error al crear usuario', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al crear usuario', variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    try {
      const response = await fetch(`/api/admin/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserForm),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Éxito', description: 'Usuario actualizado correctamente' });
        setIsEditUserDialogOpen(false);
        cargarUsuarios();
      } else {
        toast({ title: 'Error', description: result.error || 'Error al actualizar usuario', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al actualizar usuario', variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !changeRoleValue) return;

    setSavingUser(true);
    try {
      const response = await fetch(`/api/admin/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: changeRoleValue }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Éxito', description: 'Rol actualizado correctamente' });
        setIsChangeRoleDialogOpen(false);
        cargarUsuarios();
      } else {
        toast({ title: 'Error', description: result.error || 'Error al cambiar rol', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al cambiar rol', variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    setSavingUser(true);
    try {
      const newStatus = selectedUser.estatus === 'Activo' ? 'Inactivo' : 'Activo';
      const response = await fetch(`/api/admin/usuarios/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Éxito', description: `Usuario ${newStatus === 'Activo' ? 'activado' : 'desactivado'} correctamente` });
        setIsToggleStatusAlertOpen(false);
        cargarUsuarios();
      } else {
        toast({ title: 'Error', description: result.error || 'Error al cambiar estado', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al cambiar estado', variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleOpenEditRole = (role: Role) => {
    setSelectedRole(role);
    setCurrentRoleName(role.name);
    setCurrentRolePermissions(JSON.parse(JSON.stringify(role.permissions)));
    setIsEditRoleDialogOpen(true);
  };

  const handleOpenCreateRole = () => {
    setSelectedRole(null);
    setCurrentRoleName('');
    setCurrentRolePermissions({});
    setIsCreateRoleDialogOpen(true);
  };

  const handlePermissionChange = (module: string, permission: Permission, checked: boolean) => {
    setCurrentRolePermissions(prev => {
      const newPermissions = { ...prev };
      if (!newPermissions[module]) {
        newPermissions[module] = [];
      }
      if (checked) {
        if (!newPermissions[module].includes(permission)) {
          newPermissions[module].push(permission);
        }
        if (!newPermissions[module].includes('ver')) {
          newPermissions[module].push('ver');
        }
      } else {
        newPermissions[module] = newPermissions[module].filter(p => p !== permission);
        if (permission === 'ver') {
          newPermissions[module] = [];
        }
      }
      return newPermissions;
    });
  };

  const handleSaveRole = () => {
    let updatedRoles: Role[];

    if (selectedRole) {
      updatedRoles = roles.map(r => r.name === selectedRole.name ? { name: currentRoleName, permissions: currentRolePermissions } : r);
    } else {
      // Verificar que no exista un rol con el mismo nombre
      if (roles.find(r => r.name.toLowerCase() === currentRoleName.toLowerCase())) {
        toast({ title: 'Error', description: 'Ya existe un rol con ese nombre', variant: 'destructive' });
        return;
      }
      updatedRoles = [...roles, { name: currentRoleName, permissions: currentRolePermissions }];
    }

    setRoles(updatedRoles);

    // Guardar roles personalizados en localStorage
    const customRoles = updatedRoles.filter(r => !ROLES_PREDETERMINADOS.includes(r.name));
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(customRoles));
    } catch (e) {
      console.error('Error guardando roles en localStorage:', e);
    }

    setIsCreateRoleDialogOpen(false);
    setIsEditRoleDialogOpen(false);
    toast({ title: 'Éxito', description: 'Rol guardado correctamente' });
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;

    // No permitir eliminar roles predeterminados
    if (ROLES_PREDETERMINADOS.includes(roleToDelete.name)) {
      toast({ title: 'Error', description: 'No se pueden eliminar los roles predeterminados', variant: 'destructive' });
      setIsDeleteRoleAlertOpen(false);
      return;
    }

    const updatedRoles = roles.filter(r => r.name !== roleToDelete.name);
    setRoles(updatedRoles);

    // Actualizar localStorage
    const customRoles = updatedRoles.filter(r => !ROLES_PREDETERMINADOS.includes(r.name));
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(customRoles));
    } catch (e) {
      console.error('Error guardando roles en localStorage:', e);
    }

    setIsDeleteRoleAlertOpen(false);
    setRoleToDelete(null);
    toast({ title: 'Éxito', description: 'Rol eliminado correctamente' });
  };

  const handleOpenDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteRoleAlertOpen(true);
  };

  const getRolDisplayName = (rol: string) => {
    return ROLES_DISPLAY[rol] || rol;
  };

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Configuración general</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          </TabsList>

          {/* Tab: Configuración General */}
          <TabsContent value="general">
            <div className="grid gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Empresa</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                      <Input id="companyName" defaultValue="La Cantera" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rfc">RFC / NIT *</Label>
                      <Input id="rfc" defaultValue="" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscalAddress">Dirección Fiscal</Label>
                      <Input id="fiscalAddress" placeholder="Calle, Número, Colonia, CP, Ciudad, Estado" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Logo de la Empresa</Label>
                    <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Arrastra tu logo aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos: PNG, JPG - Máx: 2MB
                      </p>
                      <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preferencias del Sistema</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select defaultValue="es">
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Seleccionar idioma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Zona Horaria</Label>
                      <Select defaultValue="gmt-6">
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Seleccionar zona horaria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gmt-6">América/Ciudad de México (GMT-6)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Moneda Predeterminada</Label>
                      <Select defaultValue="mxn">
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mxn">MXN - Peso Mexicano</SelectItem>
                          <SelectItem value="usd">USD - Dólar Americano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Formato de Fecha</Label>
                      <Select defaultValue="ddmmyyyy">
                        <SelectTrigger id="dateFormat">
                          <SelectValue placeholder="Seleccionar formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mmddyyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyymmdd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberFormat">Formato de Números</Label>
                      <Select defaultValue="comma">
                        <SelectTrigger id="numberFormat">
                          <SelectValue placeholder="Seleccionar formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comma">1,234.56 (Coma para miles)</SelectItem>
                          <SelectItem value="dot">1.234,56 (Punto para miles)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end mt-2">
                <Button>Guardar Configuración</Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Usuarios */}
          <TabsContent value="users">
            <Card className='mt-6'>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Usuarios del Sistema</CardTitle>
                    <CardDescription>
                      Gestione los usuarios administradores y sus roles en el sistema.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cargarUsuarios} disabled={loadingUsers}>
                      <RefreshCw className={cn("h-4 w-4 mr-1", loadingUsers && "animate-spin")} />
                      Actualizar
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => setIsNewUserDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4" />
                      Nuevo Usuario
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Cargando usuarios...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    No hay usuarios administradores registrados
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.nombre}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRolDisplayName(user.rol)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusVariant[user.estatus]}
                              className={cn(
                                user.estatus === 'Activo'
                                  ? 'dark:bg-green-500/20 dark:text-green-200 bg-green-100 text-green-800'
                                  : 'dark:bg-red-500/20 dark:text-red-200 bg-red-100 text-red-800'
                              )}
                            >
                              {user.estatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-haspopup="true"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleActionClick(user)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { handleActionClick(user); setIsEditUserDialogOpen(true); }}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { handleActionClick(user); setIsChangeRoleDialogOpen(true); }}>
                                  Cambiar Rol
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={user.estatus === 'Activo' ? 'text-red-500' : 'text-green-500'}
                                  onSelect={() => { handleActionClick(user); setIsToggleStatusAlertOpen(true); }}
                                >
                                  {user.estatus === 'Activo' ? 'Desactivar' : 'Activar'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Roles y Permisos */}
          <TabsContent value="roles">
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Roles y Permisos</CardTitle>
                    <CardDescription>
                      Configure los permisos de cada rol en el sistema.
                    </CardDescription>
                  </div>
                  <Button size="sm" className="gap-1" onClick={handleOpenCreateRole}>
                    <PlusCircle className="h-4 w-4" />
                    Crear Rol
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol</TableHead>
                      <TableHead>Módulos Permitidos</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => {
                      const isPredeterminado = ROLES_PREDETERMINADOS.includes(role.name);
                      const tieneCrearEditar = Object.values(role.permissions).some(p => p.includes('crear_editar'));
                      const tieneEliminar = Object.values(role.permissions).some(p => p.includes('eliminar'));

                      return (
                        <TableRow key={role.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {role.name}
                              {isPredeterminado && (
                                <Badge variant="secondary" className="text-xs">Predeterminado</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {Object.keys(role.permissions)
                              .map(href => navItems.find(item => item.href === href)?.title)
                              .filter(Boolean)
                              .join(', ') || 'Sin permisos específicos'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">Ver</Badge>
                              {tieneCrearEditar && (
                                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">Crear/Editar</Badge>
                              )}
                              {tieneEliminar && (
                                <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950">Eliminar</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenEditRole(role)}>
                                Editar
                              </Button>
                              {!isPredeterminado && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleOpenDeleteRole(role)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Nuevo Usuario */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Complete la información para agregar un nuevo usuario administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">Nombre</Label>
              <Input
                id="new-name"
                placeholder="Ej. Juan Pérez"
                className="col-span-3"
                value={newUserForm.nombre}
                onChange={(e) => setNewUserForm({ ...newUserForm, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-email" className="text-right">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="juan.perez@example.com"
                className="col-span-3"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                className="col-span-3"
                value={newUserForm.contrasena}
                onChange={(e) => setNewUserForm({ ...newUserForm, contrasena: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-role" className="text-right">Rol</Label>
              <Select
                value={newUserForm.rol}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, rol: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccione un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_DISPONIBLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreateUser} disabled={savingUser}>
              {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuario */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique la información del usuario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Nombre</Label>
              <Input
                id="edit-name"
                value={editUserForm.nombre}
                onChange={(e) => setEditUserForm({ ...editUserForm, nombre: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={savingUser}>
              {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambiar Rol */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo rol para <span className="font-semibold">{selectedUser?.nombre}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="change-role">Nuevo Rol</Label>
            <Select value={changeRoleValue} onValueChange={setChangeRoleValue}>
              <SelectTrigger id="change-role">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_DISPONIBLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsChangeRoleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangeRole} disabled={savingUser}>
              {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Toggle Status */}
      <AlertDialog open={isToggleStatusAlertOpen} onOpenChange={setIsToggleStatusAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado del usuario <span className="font-semibold">{selectedUser?.nombre}</span> a{' '}
              <span className="font-semibold">{selectedUser?.estatus === 'Activo' ? 'Inactivo' : 'Activo'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus} disabled={savingUser}>
              {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedUser?.estatus === 'Activo' ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Crear/Editar Rol */}
      <Dialog open={isCreateRoleDialogOpen || isEditRoleDialogOpen} onOpenChange={isEditRoleDialogOpen ? setIsEditRoleDialogOpen : setIsCreateRoleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Editar' : 'Crear'} Rol</DialogTitle>
            <DialogDescription>Defina el nombre y los permisos para este rol.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Nombre del Rol</Label>
              <Input
                id="roleName"
                value={currentRoleName}
                onChange={(e) => setCurrentRoleName(e.target.value)}
                placeholder="Ej. Gerente de Compras"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Permisos del Módulo</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-center">Ver</TableHead>
                    <TableHead className="text-center">Crear/Editar</TableHead>
                    <TableHead className="text-center">Eliminar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableModules.map(module => (
                    <TableRow key={module.href}>
                      <TableCell className="font-medium">{module.title}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentRolePermissions[module.href]?.includes('ver')}
                          onCheckedChange={(checked) => handlePermissionChange(module.href, 'ver', !!checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentRolePermissions[module.href]?.includes('crear_editar')}
                          onCheckedChange={(checked) => handlePermissionChange(module.href, 'crear_editar', !!checked)}
                          disabled={!currentRolePermissions[module.href]?.includes('ver')}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={currentRolePermissions[module.href]?.includes('eliminar')}
                          onCheckedChange={(checked) => handlePermissionChange(module.href, 'eliminar', !!checked)}
                          disabled={!currentRolePermissions[module.href]?.includes('ver')}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setIsCreateRoleDialogOpen(false); setIsEditRoleDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole}>Guardar Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: Eliminar Rol */}
      <AlertDialog open={isDeleteRoleAlertOpen} onOpenChange={setIsDeleteRoleAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el rol <span className="font-semibold">{roleToDelete?.name}</span>.
              Los usuarios que tengan este rol asignado deberán ser reasignados a otro rol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar Rol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
