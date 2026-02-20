'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/app/providers';
import { useToast } from '@/hooks/use-toast';

interface EmpresaOpcion {
  codigoPortal: string;
  codigoERP: string;
  nombre: string;
}

export default function RegistroProveedorPage() {
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // RFC verification via CNspEmpresasDelProveedor
  const [rfcLoading, setRfcLoading] = useState(false);
  const [rfcStatus, setRfcStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [empresasDetectadas, setEmpresasDetectadas] = useState<EmpresaOpcion[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  useEffect(() => {
    if (user) router.push('/proveedores/dashboard');
  }, [user, router]);

  // Verificar RFC con debounce usando CNspEmpresasDelProveedor
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (rfc.length < 12) {
      setRfcStatus('idle');
      setEmpresasDetectadas([]);
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
          setEmpresasDetectadas(data.empresas);
          setRfcStatus('ok');
          // Auto-poblar razón social si está vacía
          if (!razonSocial && data.rfcNombre) setRazonSocial(data.rfcNombre);
        } else {
          setEmpresasDetectadas([]);
          setRfcStatus('error');
        }
      } catch {
        setEmpresasDetectadas([]);
        setRfcStatus('error');
      } finally {
        setRfcLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rfc]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rfcStatus !== 'ok') {
      setError('El RFC no ha sido validado. Verifique que sea un RFC de proveedor registrado.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nombre: contactName,
          rfc,
          razonSocial,
          // Sin empresaCode — el backend determina las empresas via CNspEmpresasDelProveedor
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Ocurrió un error al registrar la cuenta.');
        setLoading(false);
        return;
      }

      toast({
        title: 'Registro exitoso',
        description: result.message || 'Tu cuenta ha sido creada.',
      });

      // Login automático con la primera empresa disponible
      const primeraEmpresa = result.primeraEmpresa ?? empresasDetectadas[0]?.codigoPortal;
      const signInResult = await signIn('credentials', {
        email,
        password,
        empresaCode: primeraEmpresa,
        rfc,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Registro exitoso, pero hubo un error al iniciar sesión. Por favor inicia sesión manualmente.');
        setLoading(false);
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      router.push('/proveedores/dashboard');
    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(err.message || 'Ocurrió un error al registrar la cuenta.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background py-12">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          fill
          className="absolute inset-0 z-0 object-cover"
          data-ai-hint={bgImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/60 z-10" />

      <Card className="w-full max-w-lg bg-card/80 backdrop-blur-sm border-border/20 z-20">
        <CardHeader className="text-center">
          {logo && (
            <Image
              src={logo.imageUrl}
              alt={logo.description}
              width={80}
              height={40}
              className="mx-auto"
              data-ai-hint={logo.imageHint}
            />
          )}
          <CardTitle className="text-2xl mt-4">Registro de Proveedor</CardTitle>
          <CardDescription>Complete el formulario para crear su cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && <p className="text-red-500 text-center font-medium text-sm">{error}</p>}

            {/* RFC — primer campo, determina todo */}
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <div className="relative">
                <Input
                  id="rfc"
                  type="text"
                  placeholder="SUE010101ABC"
                  required
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
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {rfcLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!rfcLoading && rfcStatus === 'ok' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!rfcLoading && rfcStatus === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Empresas detectadas — solo informativo */}
              {rfcStatus === 'ok' && empresasDetectadas.length > 0 && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-green-700 font-medium">
                    ✓ RFC verificado. Proveedor registrado en:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {empresasDetectadas.map((emp) => (
                      <span
                        key={emp.codigoPortal}
                        className="inline-flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-800 rounded px-2 py-0.5"
                      >
                        <Building2 className="h-3 w-3" />
                        {emp.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {rfcStatus === 'error' && rfc.length >= 12 && (
                <p className="text-xs text-red-600">
                  ✗ RFC no encontrado como proveedor en ninguna empresa del sistema.
                </p>
              )}
            </div>

            {/* Razón Social */}
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social</Label>
              <Input
                id="razonSocial"
                type="text"
                placeholder="Su Empresa S.A. de C.V."
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Nombre de contacto */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre del Contacto</Label>
              <Input
                id="contactName"
                type="text"
                placeholder="Juan Pérez"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={loading}
              />
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
              />
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={confirmPasswordVisible ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    disabled={loading}
                  >
                    {confirmPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Términos */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox id="terms" className="mt-1" required disabled={loading} />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                He leído y acepto los{' '}
                <Link href="#" className="underline text-primary">
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link href="#" className="underline text-primary">
                  Política de Privacidad
                </Link>
                .
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || rfcStatus !== 'ok'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrarse'
              )}
            </Button>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tiene una cuenta?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Iniciar sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
