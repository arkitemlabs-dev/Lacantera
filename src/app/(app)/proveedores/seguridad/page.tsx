'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle,
  XCircle,
  Shield
} from 'lucide-react';
import {
  cambiarContrasena,
  getHistorialSesiones,
  getDatosSeguridad,
  actualizarEmailRecuperacion,
  type SesionHistorial,
} from '@/app/actions/seguridad';

export default function SeguridadProveedorPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Estados para cambio de contraseña
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showContrasenaActual, setShowContrasenaActual] = useState(false);
  const [showNuevaContrasena, setShowNuevaContrasena] = useState(false);
  const [showConfirmarContrasena, setShowConfirmarContrasena] = useState(false);
  const [guardandoContrasena, setGuardandoContrasena] = useState(false);

  // Estados para email de recuperación
  const [emailRecuperacion, setEmailRecuperacion] = useState('');
  const [guardandoEmail, setGuardandoEmail] = useState(false);

  // Estados para historial de sesiones
  const [historialSesiones, setHistorialSesiones] = useState<SesionHistorial[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  // Estados para 2FA
  const [tiene2FA, setTiene2FA] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    if (user?.id) {
      cargarDatos();
    }
  }, [user?.id]);

  const cargarDatos = async () => {
    if (!user?.id) return;

    try {
      setCargandoHistorial(true);

      // Cargar historial de sesiones y datos de seguridad en paralelo
      const [historialRes, seguridadRes] = await Promise.all([
        getHistorialSesiones(user.id, 10),
        getDatosSeguridad(user.id),
      ]);

      if (historialRes.success) {
        setHistorialSesiones(historialRes.data);
      }

      if (seguridadRes.success && seguridadRes.data) {
        setEmailRecuperacion(seguridadRes.data.emailRecuperacion || '');
        setTiene2FA(seguridadRes.data.tiene2FA);
      }
    } catch (error) {
      console.error('Error cargando datos de seguridad:', error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Manejar cambio de contraseña
  const handleCambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el usuario',
        variant: 'destructive',
      });
      return;
    }

    // Validaciones
    if (!contrasenaActual) {
      toast({
        title: 'Error',
        description: 'Ingrese su contraseña actual',
        variant: 'destructive',
      });
      return;
    }

    if (nuevaContrasena.length < 8) {
      toast({
        title: 'Error',
        description: 'La nueva contraseña debe tener al menos 8 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    setGuardandoContrasena(true);

    try {
      const result = await cambiarContrasena({
        usuarioId: user.id,
        contrasenaActual,
        nuevaContrasena,
      });

      if (result.success) {
        toast({
          title: 'Contraseña actualizada',
          description: 'Su contraseña ha sido cambiada exitosamente',
        });
        // Limpiar campos
        setContrasenaActual('');
        setNuevaContrasena('');
        setConfirmarContrasena('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo cambiar la contraseña',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al cambiar la contraseña',
        variant: 'destructive',
      });
    } finally {
      setGuardandoContrasena(false);
    }
  };

  // Manejar actualización de email de recuperación
  const handleActualizarEmail = async () => {
    if (!user?.id) return;

    if (!emailRecuperacion || !emailRecuperacion.includes('@')) {
      toast({
        title: 'Error',
        description: 'Ingrese un email válido',
        variant: 'destructive',
      });
      return;
    }

    setGuardandoEmail(true);

    try {
      const result = await actualizarEmailRecuperacion(user.id, emailRecuperacion);

      if (result.success) {
        toast({
          title: 'Email actualizado',
          description: 'El email de recuperación ha sido actualizado',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo actualizar el email',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar el email',
        variant: 'destructive',
      });
    } finally {
      setGuardandoEmail(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha: Date) => {
    return new Date(fecha).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Icono del dispositivo
  const getDispositivoIcon = (dispositivo: string) => {
    switch (dispositivo.toLowerCase()) {
      case 'móvil':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="text-foreground">Seguridad</span>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Seguridad de la Cuenta</h1>
      </div>

      <div className="space-y-8">
        {/* Cambiar Contraseña */}
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Para su seguridad, le recomendamos utilizar una contraseña segura
              que no utilice en otros sitios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCambiarContrasena} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showContrasenaActual ? 'text' : 'password'}
                    value={contrasenaActual}
                    onChange={(e) => setContrasenaActual(e.target.value)}
                    className="bg-background/40 pr-10"
                    disabled={guardandoContrasena}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowContrasenaActual(!showContrasenaActual)}
                  >
                    {showContrasenaActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNuevaContrasena ? 'text' : 'password'}
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      className="bg-background/40 pr-10"
                      disabled={guardandoContrasena}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNuevaContrasena(!showNuevaContrasena)}
                    >
                      {showNuevaContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmarContrasena ? 'text' : 'password'}
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      className="bg-background/40 pr-10"
                      disabled={guardandoContrasena}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmarContrasena(!showConfirmarContrasena)}
                    >
                      {showConfirmarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={guardandoContrasena}>
                  {guardandoContrasena ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2FA */}
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Autenticación de Dos Factores</CardTitle>
              <CardDescription>
                Añada una capa extra de seguridad a su cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="2fa-switch" className="font-medium">
                    Activar 2FA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Se le pedirá un código de verificación al iniciar sesión.
                  </p>
                </div>
                <Switch
                  id="2fa-switch"
                  checked={tiene2FA}
                  onCheckedChange={() => {
                    toast({
                      title: 'Próximamente',
                      description: 'La autenticación de dos factores estará disponible pronto.',
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email de Recuperación */}
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Recuperación de Contraseña</CardTitle>
              <CardDescription>
                Gestione su correo electrónico de recuperación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">
                  Correo Electrónico de Recuperación
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={emailRecuperacion}
                  onChange={(e) => setEmailRecuperacion(e.target.value)}
                  className="bg-background/40"
                  disabled={guardandoEmail}
                />
              </div>
              <Button
                onClick={handleActualizarEmail}
                disabled={guardandoEmail}
              >
                {guardandoEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Correo'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Sesiones */}
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Historial de Inicio de Sesión</CardTitle>
            <CardDescription>
              Revise los inicios de sesión recientes en su cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cargandoHistorial ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : historialSesiones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay registros de inicio de sesión aún.</p>
                <p className="text-sm">El historial se mostrará después de iniciar sesión.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Navegador</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Dirección IP</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialSesiones.map((sesion) => (
                    <TableRow key={sesion.id}>
                      <TableCell className="font-medium">
                        {formatearFecha(sesion.fechaHora)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDispositivoIcon(sesion.dispositivo)}
                          <span>{sesion.dispositivo}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sesion.navegador}</TableCell>
                      <TableCell>{sesion.sistemaOperativo}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {sesion.direccionIP}
                      </TableCell>
                      <TableCell>
                        {sesion.exitoso ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Exitoso
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Fallido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
