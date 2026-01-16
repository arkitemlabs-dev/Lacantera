'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  // Obtener parámetros de URL
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams]);

  // Verificar token
  useEffect(() => {
    async function verifyToken() {
      if (!token || !email) {
        setLoading(false);
        setError('Enlace de recuperación inválido');
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setError(data.error || 'El enlace de recuperación es inválido o ha expirado');
        }
      } catch (err) {
        setError('Error al verificar el enlace');
      } finally {
        setLoading(false);
      }
    }

    if (token && email) {
      verifyToken();
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validaciones
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer la contrasena');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contrasena');
    } finally {
      setSubmitting(false);
    }
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando enlace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token inválido o expirado
  if (!tokenValid && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Enlace inv&aacute;lido</CardTitle>
            <CardDescription>
              {error || 'El enlace de recuperaci&oacute;n no es v&aacute;lido o ha expirado'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No se puede continuar</AlertTitle>
              <AlertDescription>
                Por favor solicita un nuevo enlace de recuperaci&oacute;n de contrase&ntilde;a.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">
                Solicitar nuevo enlace
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesi&oacute;n
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Exito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Contrase&ntilde;a actualizada</CardTitle>
            <CardDescription>
              Tu contrase&ntilde;a ha sido restablecida exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Listo!</AlertTitle>
              <AlertDescription>
                Ya puedes iniciar sesi&oacute;n con tu nueva contrase&ntilde;a.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">
                Iniciar sesi&oacute;n
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Formulario de reset
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nueva contrase&ntilde;a</CardTitle>
          <CardDescription>
            Ingresa tu nueva contrase&ntilde;a para la cuenta <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contrase&ntilde;a</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrase&ntilde;a</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  minLength={6}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>La contrase&ntilde;a debe:</p>
              <ul className="list-disc list-inside mt-1">
                <li className={password.length >= 6 ? 'text-green-600' : ''}>
                  Tener al menos 6 caracteres
                </li>
                <li className={password && password === confirmPassword ? 'text-green-600' : ''}>
                  Coincidir en ambos campos
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || password.length < 6 || password !== confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Actualizar contrase&ntilde;a
                </>
              )}
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesi&oacute;n
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
