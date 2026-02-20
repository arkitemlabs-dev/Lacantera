'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Building2, Loader2, User, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '../providers';
import { useToast } from '@/hooks/use-toast';
import { getTodasLasEmpresas } from '@/lib/database/tenant-configs';

// Empresas estáticas para administradores (todos los 10 ambientes)
const EMPRESAS_ADMIN = getTodasLasEmpresas().map((config) => ({
  codigo: config.code,
  nombre: config.nombre,
}));

interface EmpresaOpcion {
  codigoPortal: string;
  codigoERP: string;
  nombre: string;
}

export function LoginForm() {
  const [tipoUsuario, setTipoUsuario] = useState<'proveedor' | 'administrador' | ''>('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // RFC — solo proveedores
  const [rfc, setRfc] = useState('');
  const [rfcLoading, setRfcLoading] = useState(false);
  const [rfcStatus, setRfcStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [empresasRfc, setEmpresasRfc] = useState<EmpresaOpcion[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  // Resetear empresa y RFC cuando cambia el tipo de usuario
  useEffect(() => {
    setEmpresaSeleccionada('');
    setRfc('');
    setRfcStatus('idle');
    setEmpresasRfc([]);
    setError(null);
  }, [tipoUsuario]);

  // Resetear empresa cuando cambia el RFC
  useEffect(() => {
    setEmpresaSeleccionada('');
  }, [rfc]);

  // Lookup de empresas con debounce cuando RFC tiene 12+ chars (solo proveedores)
  useEffect(() => {
    if (tipoUsuario !== 'proveedor') return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (rfc.length < 12) {
      setRfcStatus('idle');
      setEmpresasRfc([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setRfcLoading(true);
      setRfcStatus('idle');
      try {
        const res = await fetch(
          `/api/auth/empresas-proveedor?rfc=${encodeURIComponent(rfc)}&ambiente=Pruebas`
        );
        const data = await res.json();
        if (data.success && data.empresas.length > 0) {
          setEmpresasRfc(data.empresas);
          setRfcStatus('ok');
          // Auto-seleccionar si solo hay una empresa
          if (data.empresas.length === 1) {
            setEmpresaSeleccionada(data.empresas[0].codigoPortal);
          }
        } else {
          setEmpresasRfc([]);
          setRfcStatus('error');
        }
      } catch {
        setEmpresasRfc([]);
        setRfcStatus('error');
      } finally {
        setRfcLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rfc, tipoUsuario]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tipoUsuario) {
      setError('Por favor, seleccione un tipo de usuario');
      return;
    }

    // RFC obligatorio para proveedores
    if (tipoUsuario === 'proveedor') {
      if (rfc.length < 12) {
        setError('El RFC es obligatorio para proveedores (mínimo 12 caracteres)');
        return;
      }
      if (rfcStatus !== 'ok') {
        setError('El RFC no se encontró en ninguna empresa. Verifíquelo e intente de nuevo.');
        return;
      }
    }

    if (!empresaSeleccionada) {
      setError('Por favor, seleccione una empresa');
      return;
    }

    if (!email || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        userType: tipoUsuario,
        empresaCode: empresaSeleccionada,
        rfc: tipoUsuario === 'proveedor' ? rfc : '',
        userAgent: navigator.userAgent,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        const empresaObj =
          tipoUsuario === 'proveedor'
            ? empresasRfc.find((e) => e.codigoPortal === empresaSeleccionada)
            : EMPRESAS_ADMIN.find((e) => e.codigo === empresaSeleccionada);

        toast({
          title: 'Inicio de sesión exitoso',
          description: `Bienvenido a ${empresaObj?.nombre || 'la aplicación'}`,
        });

        window.location.href =
          tipoUsuario === 'proveedor' ? '/proveedores/dashboard' : '/dashboard';
      }
    } catch {
      setError('Ocurrió un error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          fill
          className="absolute inset-0 z-0 object-cover"
          data-ai-hint={bgImage.imageHint}
          priority
          sizes="100vw"
        />
      )}
      <div className="absolute inset-0 bg-black/50 z-10" />

      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/20 z-20">
        <CardHeader className="text-center">
          {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={100}
              height={50}
              className="mx-auto"
              data-ai-hint={logo.imageHint}
              priority
            />
          )}
          <CardTitle className="text-2xl mt-4">La Cantera Desarrollos Mineros</CardTitle>
          <CardDescription>Portal de Proveedores</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Tipo de Usuario */}
            <div className="space-y-2">
              <Label htmlFor="tipoUsuario">Tipo de Usuario</Label>
              <Select
                value={tipoUsuario}
                onValueChange={(value: 'proveedor' | 'administrador') => setTipoUsuario(value)}
                disabled={loading}
              >
                <SelectTrigger id="tipoUsuario">
                  <SelectValue placeholder="Seleccione tipo de usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proveedor">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Proveedor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="administrador">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Administrador</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* RFC — solo para proveedores */}
            {tipoUsuario === 'proveedor' && (
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC</Label>
                <div className="relative">
                  <Input
                    id="rfc"
                    type="text"
                    placeholder="RFC del proveedor"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase().trim())}
                    disabled={loading}
                    maxLength={13}
                    className={
                      rfcStatus === 'ok'
                        ? 'border-green-500 pr-10'
                        : rfcStatus === 'error'
                        ? 'border-red-500 pr-10'
                        : 'pr-10'
                    }
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {rfcLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!rfcLoading && rfcStatus === 'ok' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {!rfcLoading && rfcStatus === 'error' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {rfcStatus === 'error' && (
                  <p className="text-xs text-red-600">
                    RFC no encontrado como proveedor en el sistema.
                  </p>
                )}
              </div>
            )}

            {/* Empresa — dinámica para proveedor, estática para admin */}
            {tipoUsuario === 'administrador' && (
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select
                  value={empresaSeleccionada}
                  onValueChange={setEmpresaSeleccionada}
                  disabled={loading}
                >
                  <SelectTrigger id="empresa">
                    <SelectValue placeholder="Seleccione una empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPRESAS_ADMIN.map((empresa) => (
                      <SelectItem key={empresa.codigo} value={empresa.codigo}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{empresa.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tipoUsuario === 'proveedor' && rfcStatus === 'ok' && empresasRfc.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="empresaProveedor">Empresa</Label>
                <Select
                  value={empresaSeleccionada}
                  onValueChange={setEmpresaSeleccionada}
                  disabled={loading}
                >
                  <SelectTrigger id="empresaProveedor">
                    <SelectValue placeholder="Seleccione la empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasRfc.map((empresa) => (
                      <SelectItem key={empresa.codigoPortal} value={empresa.codigoPortal}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{empresa.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@suempresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  disabled={loading}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Recordar y Olvidé contraseña */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" disabled={loading} />
                <Label htmlFor="remember-me" className="text-sm font-normal">
                  Recordarme
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="inline-block text-sm text-primary hover:underline"
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>

            {/* Botón de Login */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            {/* Enlaces de registro */}
            <div className="mt-4 text-center text-sm">
              ¿Nuevo usuario? Registrar como:
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="outline" className="w-full" asChild disabled={loading}>
                  <Link href="/proveedores/registro">Proveedor</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild disabled={loading}>
                  <Link href="/admin/registro">Administrador</Link>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
