
'use client';

import { useState } from 'react';
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
    DialogTrigger,
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { navItems } from '../nav';
import { Separator } from '@/components/ui/separator';

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'Activo' | 'Inactivo';
};

type Permission = 'ver' | 'crear_editar' | 'eliminar';

type Role = {
    name: string;
    permissions: {
        [module: string]: Permission[];
    };
};

const initialRoles: Role[] = [
    {
      name: 'Super Admin',
      permissions: Object.fromEntries(navItems.map(item => [item.href, ['ver', 'crear_editar', 'eliminar']])),
    },
    {
      name: 'Compras',
      permissions: {
        '/proveedores': ['ver', 'crear_editar'],
        '/ordenes-de-compra': ['ver', 'crear_editar'],
        '/facturas': ['ver'],
      },
    },
    {
      name: 'Contabilidad',
      permissions: {
        '/facturas': ['ver', 'crear_editar'],
        '/pagos': ['ver', 'crear_editar'],
      },
    },
    {
      name: 'Solo lectura',
      permissions: Object.fromEntries(navItems.map(item => [item.href, ['ver']])),
    },
  ];

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan.perez@globalmining.com',
    role: 'Super Admin',
    status: 'Activo',
  },
  {
    id: '2',
    name: 'Maria García',
    email: 'maria.garcia@globalmining.com',
    role: 'Compras',
    status: 'Activo',
  },
  {
    id: '3',
    name: 'Carlos López',
    email: 'carlos.lopez@globalmining.com',
    role: 'Contabilidad',
    status: 'Activo',
  },
  {
    id: '4',
    name: 'Ana Martinez',
    email: 'ana.martinez@globalmining.com',
    role: 'Solo lectura',
    status: 'Inactivo',
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  Activo: 'default',
  Inactivo: 'secondary',
};

const availableModules = navItems.filter(item => item.href !== '/dashboard' && item.href !== '/perfil');

export default function ConfiguracionPage() {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
    const [isToggleStatusAlertOpen, setIsToggleStatusAlertOpen] = useState(false);
    const [isCreateRoleDialogOpen, setIsCreateRoleDialogOpen] = useState(false);
    const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
    const [currentRolePermissions, setCurrentRolePermissions] = useState<Role['permissions']>({});
    const [currentRoleName, setCurrentRoleName] = useState('');

    const handleActionClick = (user: User) => {
        setSelectedUser(user);
    };

    const handleToggleStatus = () => {
        if (selectedUser) {
            setUsers(users.map(u => 
                u.id === selectedUser.id 
                ? { ...u, status: u.status === 'Activo' ? 'Inactivo' : 'Activo' }
                : u
            ));
        }
        setIsToggleStatusAlertOpen(false);
    };

    const handleOpenEditRole = (role: Role) => {
        setSelectedRole(role);
        setCurrentRoleName(role.name);
        setCurrentRolePermissions(JSON.parse(JSON.stringify(role.permissions))); // Deep copy
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
                // Si se marca cualquier permiso, 'ver' debe estar marcado
                if (!newPermissions[module].includes('ver')) {
                    newPermissions[module].push('ver');
                }
            } else {
                newPermissions[module] = newPermissions[module].filter(p => p !== permission);
                // Si 'ver' se desmarca, todos los demás también deben desmarcarse
                if (permission === 'ver') {
                    newPermissions[module] = [];
                }
            }
            return newPermissions;
        });
    };

    const handleSaveRole = () => {
        if (selectedRole) { // Edit
            setRoles(roles.map(r => r.name === selectedRole.name ? { name: currentRoleName, permissions: currentRolePermissions } : r));
        } else { // Create
            setRoles([...roles, { name: currentRoleName, permissions: currentRolePermissions }]);
        }
        setIsCreateRoleDialogOpen(false);
        setIsEditRoleDialogOpen(false);
    };

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Configuración</h1>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Configuración general</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
          </TabsList>
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
                      <Input
                        id="companyName"
                        defaultValue="Global Mining Solutions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rfc">RFC / NIT *</Label>
                      <Input id="rfc" defaultValue="GMS850101ABC" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscalAddress">Dirección Fiscal</Label>
                      <Input
                        id="fiscalAddress"
                        placeholder="Calle, Número, Colonia, CP, Ciudad, Estado"
                      />
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
                      <Input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
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
                                <SelectItem value="gmt-6">
                                América/Ciudad de México (GMT-6)
                                </SelectItem>
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
                                <SelectItem value="mxn">
                                MXN - Peso Mexicano
                                </SelectItem>
                                <SelectItem value="usd">
                                USD - Dólar Americano
                                </SelectItem>
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
                                <SelectItem value="comma">
                                1,234.56 (Coma para miles)
                                </SelectItem>
                                <SelectItem value="dot">
                                1.234,56 (Punto para miles)
                                </SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                   </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle>Políticas y Documentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                    <Label>Políticas de Privacidad</Label>
                    <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                        Arrastra tu documento aquí o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                        Formato: PDF - Máx: 5MB
                        </p>
                        <Input
                        type="file"
                        accept=".pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    </div>
                </CardContent>
             </Card>

              <div className="flex justify-end mt-2">
                <Button>Guardar Configuración</Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="users">
            <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
                 <Card className='mt-6'>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Usuarios del Sistema</CardTitle>
                            <CardDescription>
                            Gestione los usuarios internos y sus roles en el sistema.
                            </CardDescription>
                        </div>
                         <Button size="sm" className="gap-1" onClick={() => setIsNewUserDialogOpen(true)}>
                            <PlusCircle className="h-4 w-4" />
                            Nuevo Usuario
                        </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Módulos Permitidos</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>
                                <span className="sr-only">Acciones</span>
                            </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                const userRole = roles.find(r => r.name === user.role);
                                const permittedModules = userRole ? Object.keys(userRole.permissions).map(href => navItems.find(item => item.href === href)?.title).filter(Boolean) : [];

                                return (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {permittedModules.join(', ')}
                                    </TableCell>
                                    <TableCell>
                                    <Badge variant={statusVariant[user.status]} className={cn(user.status === 'Activo' ? 'dark:text-green-950 text-green-800' : 'dark:text-red-950 text-red-800')}>
                                        {user.status}
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
                                        <DropdownMenuItem onSelect={() => setIsEditUserDialogOpen(true)}>Editar</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setIsChangeRoleDialogOpen(true)}>Cambiar Rol</DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-500" onSelect={() => setIsToggleStatusAlertOpen(true)}>
                                            {user.status === 'Activo' ? 'Desactivar' : 'Activar'}
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                                Completa la información para agregar un nuevo usuario al sistema.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nombre
                                </Label>
                                <Input id="name" placeholder="Ej. Juan Pérez" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input id="email" type="email" placeholder="juan.perez@example.com" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Rol
                                </Label>
                                <Select>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit">Crear Usuario</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
          </TabsContent>
          <TabsContent value="roles">
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Roles y Permisos</CardTitle>
                            <CardDescription>
                                Cree y configure los roles de los usuarios en el sistema.
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
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.name}>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {Object.keys(role.permissions)
                                        .map(href => navItems.find(item => item.href === href)?.title)
                                        .filter(Boolean)
                                        .join(', ')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditRole(role)}>
                                        Editar
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

       {/* Edit User Dialog */}
       <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifique la información del usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nombre
              </Label>
              <Input id="edit-name" defaultValue={selectedUser?.name} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input id="edit-email" type="email" defaultValue={selectedUser?.email} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsEditUserDialogOpen(false)}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
            <DialogDescription>
              Seleccione el nuevo rol para <span className="font-semibold">{selectedUser?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="change-role">Nuevo Rol</Label>
            <Select defaultValue={selectedUser?.role}>
              <SelectTrigger id="change-role">
                <SelectValue placeholder="Seleccione un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                    <SelectItem key={role.name} value={role.name}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsChangeRoleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsChangeRoleDialogOpen(false)}>Actualizar Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Alert Dialog */}
      <AlertDialog open={isToggleStatusAlertOpen} onOpenChange={setIsToggleStatusAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado del usuario <span className="font-semibold">{selectedUser?.name}</span> a <span className="font-semibold">{selectedUser?.status === 'Activo' ? 'Inactivo' : 'Activo'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {selectedUser?.status === 'Activo' ? 'Desactivar' : 'Activar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Create/Edit Role Dialog */}
      <Dialog open={isCreateRoleDialogOpen || isEditRoleDialogOpen} onOpenChange={isEditRoleDialogOpen ? setIsEditRoleDialogOpen : setIsCreateRoleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Editar' : 'Crear'} Rol</DialogTitle>
            <DialogDescription>
              Defina el nombre y los permisos para este rol.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="roleName">Nombre del Rol</Label>
                <Input id="roleName" value={currentRoleName} onChange={(e) => setCurrentRoleName(e.target.value)} placeholder="Ej. Gerente de Compras" />
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
            <Button variant="secondary" onClick={() => { setIsCreateRoleDialogOpen(false); setIsEditRoleDialogOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSaveRole}>Guardar Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

    