'use client';

import { useState, useEffect } from 'react';
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
import { Eye, EyeOff, Building2, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '../providers';
import { useToast } from '@/hooks/use-toast';
import { getTodasLasEmpresas } from '@/lib/database/tenant-configs';

// Generar lista de empresas desde la fuente de verdad
const EMPRESAS_SISTEMA = getTodasLasEmpresas().map(config => ({
  codigo: config.code,
  nombre: config.nombre,
}));

export function LoginForm() {
  // Formulario unificado
  const [tipoUsuario, setTipoUsuario] = useState<'proveedor' | 'administrador' | ''>('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Estados
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  // Manejo de login unificado
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!tipoUsuario) {
      setError('Por favor, seleccione un tipo de usuario');
      return;
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
        empresaCode: empresaSeleccionada, // Código numérico: '01', '06', etc.
        userAgent: navigator.userAgent,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        const empresaObj = EMPRESAS_SISTEMA.find((e) => e.codigo === empresaSeleccionada);

        toast({
          title: 'Inicio de sesión exitoso',
          description: `Bienvenido a ${empresaObj?.nombre || 'la aplicación'}`,
        });

        // Forzar recarga o redirección
        window.location.href = tipoUsuario === 'proveedor' ? '/proveedores/dashboard' : '/dashboard';
      }
    } catch (error: any) {
      console.error('Error en login:', error);
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Selector de Tipo de Usuario */}
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

            {/* Selector de Empresa */}
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
                  {EMPRESAS_SISTEMA.map((empresa) => (
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
              <Link href="/forgot-password" className="inline-block text-sm text-primary hover:underline">
                ¿Olvido su contrasena?
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
