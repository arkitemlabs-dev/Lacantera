
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
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '../providers';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initialRoles } from '@/lib/roles'; // Import roles

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(''); // State for selected role
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  useEffect(() => {
    if (!authLoading && user) {
      // User is already logged in, redirect them
      const fetchUserRoleAndRedirect = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'Proveedor') {
            router.push('/proveedores/dashboard');
          } else {
            router.push('/dashboard');
          }
        } else {
          // Fallback if user doc doesn't exist for some reason
          router.push('/dashboard');
        }
      };
      fetchUserRoleAndRedirect();
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError('Por favor, seleccione un tipo de usuario.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));

      if (!userDoc.exists()) {
        setError('No se encontró la información del usuario.');
        await auth.signOut(); // Sign out the user
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();

      // **Role Validation**
      if (userData.role !== role) {
        setError(`Credenciales inválidas para el rol de ${role}.`);
        await auth.signOut(); // Sign out the user
        setLoading(false);
        return;
      }

      let dashboardUrl = '/dashboard'; // Default dashboard
      if (userData.role === 'Proveedor') {
          dashboardUrl = '/proveedores/dashboard';
      }

      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Bienvenido de nuevo.',
      });

      router.push(dashboardUrl);

    } catch (error: any) {
      let errorMessage = 'Ocurrió un error al iniciar sesión.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'El correo electrónico o la contraseña son incorrectos.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Cargando...</p>
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
          objectFit="cover"
          className="absolute inset-0 z-0"
          data-ai-hint={bgImage.imageHint}
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
            />
          )}
          <CardTitle className="text-2xl mt-4">La Cantera Desarrollos Mineros</CardTitle>
          <CardDescription>
            Portal de Proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && <p className="text-red-500 text-center font-medium">{error}</p>}
            
            {/* Role Selector Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuario</Label>
              <Select onValueChange={setRole} value={role}>
                  <SelectTrigger id="role">
                      <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                  <SelectContent>
                      {initialRoles.map(r => (
                          <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select defaultValue="lqdm">
                    <SelectTrigger id="empresa">
                        <SelectValue placeholder="Seleccione una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="lqdm">La Cantera Desarrollos Mineros</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <Label htmlFor="remember-me" className="text-sm font-normal">Recordarme</Label>
              </div>
              <Link
                href="#"
                className="inline-block text-sm text-primary hover:underline"
              >
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
            <div className="mt-4 text-center text-sm">
                ¿Nuevo usuario? Registrar como:
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="outline" className="w-full" asChild>
                       <Link href="/proveedores/registro">Proveedor</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
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
