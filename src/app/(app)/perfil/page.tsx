'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Pencil } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/app/providers';

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="grid grid-cols-3 gap-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="col-span-2 font-medium">{value || '-'}</dd>
  </div>
);

// Mapeo de roles de BD a nombres de display
const ROLES_DISPLAY: Record<string, string> = {
  'super-admin': 'Super Admin',
  'admin': 'Super Admin',
  'compras': 'Compras',
  'contabilidad': 'Contabilidad',
  'solo-lectura': 'Solo lectura',
  'proveedor': 'Proveedor',
};

export default function AdminProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { userRole } = useAuth();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');

  // Estado del usuario
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: '',
  });
  const [loading, setLoading] = useState(true);

  // Estado del diálogo de edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [saving, setSaving] = useState(false);

  // Estado del diálogo de cambio de contraseña
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/admin/perfil');
          const result = await response.json();

          if (result.success) {
            setUserData({
              nombre: result.data.nombre || session.user.name || '',
              email: result.data.email || session.user.email || '',
              telefono: result.data.telefono || '',
              rol: result.data.rol || session.user.role || '',
            });
          } else {
            // Fallback a datos de sesión
            setUserData({
              nombre: session.user.name || '',
              email: session.user.email || '',
              telefono: '',
              rol: session.user.role || '',
            });
          }
        } catch (error) {
          console.error('Error cargando perfil:', error);
          // Fallback a datos de sesión
          setUserData({
            nombre: session.user.name || '',
            email: session.user.email || '',
            telefono: '',
            rol: session.user.role || '',
          });
        } finally {
          setLoading(false);
        }
      }
    };

    cargarPerfil();
  }, [session]);

  const handleOpenEditDialog = () => {
    setEditForm({
      nombre: userData.nombre,
      email: userData.email,
      telefono: userData.telefono,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.nombre || !editForm.email) {
      toast({ title: 'Error', description: 'Nombre y email son requeridos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();

      if (result.success) {
        setUserData({
          ...userData,
          nombre: editForm.nombre,
          email: editForm.email,
          telefono: editForm.telefono,
        });

        // Actualizar la sesión con los nuevos datos
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: editForm.nombre,
            email: editForm.email,
          },
        });

        toast({ title: 'Éxito', description: 'Perfil actualizado correctamente' });
        setIsEditDialogOpen(false);
      } else {
        toast({ title: 'Error', description: result.error || 'Error al actualizar perfil', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al actualizar perfil', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'Todos los campos son requeridos', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/admin/perfil/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Éxito', description: 'Contraseña actualizada correctamente' });
        setIsPasswordDialogOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast({ title: 'Error', description: result.error || 'Error al cambiar contraseña', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Error al cambiar contraseña', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col items-center justify-center gap-4 bg-muted/40 p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Cargando perfil...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <h1 className="text-3xl font-semibold">Perfil de Administrador</h1>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Información de la Cuenta</CardTitle>
                <CardDescription>
                  Estos son los detalles de tu cuenta de administrador.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleOpenEditDialog}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Perfil
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                {userAvatar && (
                  <Image
                    src={userAvatar.imageUrl}
                    alt={userAvatar.description}
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                    data-ai-hint={userAvatar.imageHint}
                  />
                )}
                <AvatarFallback>{getInitials(userData.nombre || 'AD')}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{userData.nombre || 'Sin nombre'}</h2>
                <p className="text-muted-foreground">{ROLES_DISPLAY[userData.rol] || userData.rol}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Datos Personales y de Contacto</h3>
              <div className="space-y-4">
                <InfoRow label="Nombre Completo" value={userData.nombre} />
                <InfoRow label="Correo Electrónico" value={userData.email} />
                <InfoRow label="Teléfono" value={userData.telefono || 'No especificado'} />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Información de la Cuenta</h3>
              <div className="space-y-4">
                <InfoRow label="Rol Asignado" value={ROLES_DISPLAY[userData.rol] || userData.rol} />
                <InfoRow label="ID de Usuario" value={session?.user?.id} />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Seguridad</h3>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                Cambiar Contraseña
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Editar Perfil */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu información personal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nombre" className="text-right">Nombre</Label>
              <Input
                id="edit-nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-telefono" className="text-right">Teléfono</Label>
              <Input
                id="edit-telefono"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                className="col-span-3"
                placeholder="Ej. 55 1234 5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambiar Contraseña */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña actual y la nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-password" className="text-right">Actual</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">Nueva</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirm-password" className="text-right">Confirmar</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
