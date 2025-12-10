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
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '../providers';
import { useToast } from '@/hooks/use-toast';

interface EmpresaDisponible {
  tenantId: string;
  tenantName: string;
  empresaCodigo: string;
  proveedorCodigo: string;
}

export default function LoginPage() {
  // Step 1: Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Step 2: Selección de empresa (después de validar credenciales)
  const [step, setStep] = useState<'credentials' | 'selectEmpresa'>('credentials');
  const [empresasDisponibles, setEmpresasDisponibles] = useState<EmpresaDisponible[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');

  // Estados
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  useEffect(() => {
    if (!authLoading && user) {
      redirectUserByRole();
    }
  }, [user, authLoading, router]);

  const redirectUserByRole = () => {
    if (!user) return;

    const role = user.role;

    if (role === 'proveedor') {
      router.push('/proveedores/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  // Step 1: Validar credenciales y obtener empresas
  const handleValidateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Llamar a un endpoint que valide credenciales y devuelva empresas
      const response = await fetch('/api/auth/validate-and-get-empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciales inválidas');
        setLoading(false);
        return;
      }

      if (!data.empresas || data.empresas.length === 0) {
        setError('No tiene acceso a ninguna empresa. Contacte al administrador.');
        setLoading(false);
        return;
      }

      // Guardar empresas y pasar al siguiente paso
      setEmpresasDisponibles(data.empresas);

      // Si solo tiene una empresa, auto-seleccionarla y hacer login directo
      if (data.empresas.length === 1) {
        setEmpresaSeleccionada(data.empresas[0].tenantId);
        await performLogin(data.empresas[0].tenantId);
      } else {
        // Si tiene múltiples empresas, mostrar selector
        setStep('selectEmpresa');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error validando credenciales:', error);
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  // Step 2: Hacer login con la empresa seleccionada
  const handleLoginWithEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaSeleccionada) {
      setError('Por favor, seleccione una empresa');
      return;
    }

    await performLogin(empresaSeleccionada);
  };

  const performLogin = async (tenantId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        empresaId: tenantId, // Pasar la empresa seleccionada
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        const empresaObj = empresasDisponibles.find((e) => e.tenantId === tenantId);

        toast({
          title: 'Inicio de sesión exitoso',
          description: `Bienvenido a ${empresaObj?.tenantName || 'la aplicación'}`,
        });

        // La redirección se manejará automáticamente por el useEffect
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      setError('Ocurrió un error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setEmpresaSeleccionada('');
    setEmpresasDisponibles([]);
    setError(null);
  };

  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

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
          {step === 'credentials' ? (
            /* PASO 1: Ingresar credenciales */
            <form className="space-y-4" onSubmit={handleValidateCredentials}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" disabled={loading} />
                  <Label htmlFor="remember-me" className="text-sm font-normal">
                    Recordarme
                  </Label>
                </div>
                <Link href="#" className="inline-block text-sm text-primary hover:underline">
                  ¿Olvidó su contraseña?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>

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
          ) : (
            /* PASO 2: Seleccionar empresa */
            <form className="space-y-4" onSubmit={handleLoginWithEmpresa}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="text-center py-2">
                <h3 className="text-lg font-semibold">Seleccione una Empresa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tiene acceso a {empresasDisponibles.length} empresa(s)
                </p>
              </div>

              <div className="space-y-3">
                {empresasDisponibles.map((empresa) => (
                  <div
                    key={empresa.tenantId}
                    onClick={() => setEmpresaSeleccionada(empresa.tenantId)}
                    className={`
                      relative border rounded-lg p-4 cursor-pointer transition-all
                      ${empresaSeleccionada === empresa.tenantId
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-blue-300 hover:bg-muted'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{empresa.tenantName}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Código: {empresa.empresaCodigo}
                        </div>
                        {empresa.proveedorCodigo && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Proveedor: {empresa.proveedorCodigo}
                          </div>
                        )}
                      </div>
                      {empresaSeleccionada === empresa.tenantId && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading || !empresaSeleccionada}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
