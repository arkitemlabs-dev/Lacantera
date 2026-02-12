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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/app/providers';
import { useToast } from '@/hooks/use-toast';
import { getEmpresasProduccion } from '@/lib/database/tenant-configs';

// Solo mostrar empresas de producción para registro
const EMPRESAS_REGISTRO = getEmpresasProduccion().map(config => ({
  codigo: config.code,
  nombre: config.nombre,
}));

export default function RegistroProveedorPage() {
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [empresaCode, setEmpresaCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerifyingRfc, setIsVerifyingRfc] = useState(false);
  const [rfcVerified, setRfcVerified] = useState<boolean | null>(null);
  const [detectedNombre, setDetectedNombre] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const verifyRfc = async (val: string, empCode: string) => {
    if (val.length < 12 || !empCode) return;

    setIsVerifyingRfc(true);
    setRfcVerified(null);
    try {
      const resp = await fetch('/api/auth/verify-rfc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfc: val, empresaCode: empCode }),
      });
      const data = await resp.json();
      if (data.success && data.isProvider) {
        setRfcVerified(true);
        setDetectedNombre(data.data.nombre);
        // Sugerir la razón social si está vacía
        if (!razonSocial) setRazonSocial(data.data.nombre);
      } else {
        setRfcVerified(false);
        setDetectedNombre(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingRfc(false);
    }
  };

  useEffect(() => {
    if (user) {
      router.push('/proveedores/dashboard');
    }
  }, [user, router]);

  // Verificar RFC cuando cambia el RFC o la Empresa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rfc.length >= 12 && empresaCode) {
        verifyRfc(rfc, empresaCode);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [rfc, empresaCode]);

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!empresaCode) {
      setError("Por favor, seleccione una empresa.");
      return;
    }

    if (!rfcVerified) {
      setError("El RFC no ha sido validado en el sistema de la empresa seleccionada.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    // ... rest of the function continues correctly

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          nombre: contactName,
          rfc,
          razonSocial,
          empresaCode, // Código numérico de la empresa
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Ocurrió un error al registrar la cuenta.");
        setLoading(false);
        return;
      }

      toast({
        title: "Registro exitoso",
        description: result.message || "Tu cuenta ha sido creada.",
      });

      // Login automático después de registrar
      const signInResult = await signIn('credentials', {
        email,
        password,
        empresaCode: empresaCode,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Registro exitoso pero hubo un error al iniciar sesión. Por favor inicia sesión manualmente.");
        setLoading(false);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      // Redirigir al dashboard de proveedor
      router.push('/proveedores/dashboard');

    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || "Ocurrió un error al registrar la cuenta.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background py-12">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 z-0"
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
          <CardDescription>
            Complete el formulario para crear su cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && <p className="text-red-500 text-center font-medium">{error}</p>}

            {/* Selector de Empresa */}
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Select
                value={empresaCode}
                onValueChange={setEmpresaCode}
                disabled={loading}
              >
                <SelectTrigger id="empresa">
                  <SelectValue placeholder="Seleccione la empresa donde es proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {EMPRESAS_REGISTRO.map((empresa) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="rfc">RFC</Label>
                <div className="relative">
                  <Input
                    id="rfc"
                    type="text"
                    placeholder="SUE010101ABC"
                    required
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    disabled={loading}
                    maxLength={13}
                    className={
                      rfcVerified === true
                        ? 'border-green-500 pr-10'
                        : rfcVerified === false
                          ? 'border-red-500 pr-10'
                          : 'pr-10'
                    }
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isVerifyingRfc && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {rfcVerified === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {rfcVerified === false && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {rfcVerified === true && detectedNombre && (
                  <p className="text-[10px] text-green-600 font-medium">
                    ✓ Proveedor identificado: {detectedNombre}
                  </p>
                )}
                {rfcVerified === false && rfc.length >= 12 && (
                  <p className="text-[10px] text-red-600 font-medium">
                    ✗ RFC no encontrado como proveedor en esta empresa.
                  </p>
                )}
                </div>
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
            </div>
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
                        {passwordVisible ? <EyeOff /> : <Eye />}
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
                        {confirmPasswordVisible ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="terms" className="mt-1" required disabled={loading} />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                    He leído y acepto los <Link href="#" className="underline text-primary">Términos y Condiciones</Link> y la <Link href="#" className="underline text-primary">Política de Privacidad</Link>.
                </Label>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrarse'}
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
