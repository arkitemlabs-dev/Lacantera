
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
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/providers';
import { initialRoles } from '@/lib/roles';
import { useToast } from '@/hooks/use-toast';

export default function RegistroAdminPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [role, setRole] = useState('');
  const [razonSocial, setRazonSocial] = useState('La Cantera Desarrollos Mineros S.A. de C.V.');
  const [additionalContact, setAdditionalContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  useEffect(() => {
    // Redirect if user is already logged in
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!role) {
      setError("Por favor, seleccione un rol.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        telefono,
        role,
        razonSocial,
        additionalContact,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "¡Registro exitoso!",
        description: "La cuenta de administrador ha sido creada. Ahora serás redirigido para iniciar sesión.",
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "Ocurrió un error al registrar la cuenta.";
      if (errorCode === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso. Por favor, intente con otro.";
      } else if (errorCode === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      setError(errorMessage);
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

      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-border/20 z-20">
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
          <CardTitle className="text-2xl mt-4">Registro de Administrador</CardTitle>
          <CardDescription>
            Complete el formulario para crear una nueva cuenta de administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && <p className="text-red-500 text-center font-medium">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input id="fullName" type="text" placeholder="Juan Pérez" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="juan.perez@lacanteta.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input id="telefono" type="tel" placeholder="55 1234 5678" required value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select onValueChange={setRole} value={role}>
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {initialRoles.filter(r => r.name !== 'Proveedor').map(r => (
                              <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="razonSocial">Razón Social</Label>
                <Input id="razonSocial" type="text" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="additionalContact">Datos de Contacto Adicional</Label>
                <Textarea id="additionalContact" placeholder="Notas, otro email, etc." value={additionalContact} onChange={(e) => setAdditionalContact(e.target.value)} />
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
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setPasswordVisible(!passwordVisible)}
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
                        />
                        <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        >
                        {confirmPasswordVisible ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="terms" className="mt-1" required />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                    He leído y acepto los <Link href="#" className="underline text-primary">Términos y Condiciones</Link> y la <Link href="#" className="underline text-primary">Política de Privacidad</Link>.
                </Label>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
