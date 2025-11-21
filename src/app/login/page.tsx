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
import { initialRoles } from '@/lib/roles';
import { getEmpresasByUsuario } from '@/app/actions/empresas';
import { getAllEmpresas } from '@/app/actions/get-empresas';
import { useEmpresa } from '@/contexts/EmpresaContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [empresasDisponibles, setEmpresasDisponibles] = useState<any[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { setEmpresaSeleccionada: setEmpresaContext } = useEmpresa();
  const { toast } = useToast();

  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');

  useEffect(() => {
    if (!authLoading && user) {
      redirectUserByRole();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const cargarEmpresas = async () => {
    try {
      // Cargar todas las empresas disponibles para mostrar en el selector
      const result = await getAllEmpresas();
      if (result.success) {
        setEmpresasDisponibles(result.data);
        if (result.data.length === 1) {
          setEmpresaSeleccionada(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error cargando empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const redirectUserByRole = async () => {
    if (!user) return;
  
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
  
        // Redirigir según el rol
        if (role === 'proveedor') {
          router.push('/proveedores/dashboard');
        } else {
          // Todos los admins van a /dashboard
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
      router.push('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userType) {
      setError('Por favor, seleccione un tipo de usuario.');
      return;
    }

    if (!empresaSeleccionada) {
      setError('Por favor, seleccione una empresa.');
      return;
    }

    setLoading(true);

    try {
      // Login con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      // Esperar 2 segundos para sincronización de custom claims
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Forzar refresh del token para obtener custom claims actualizados
      await loggedInUser.getIdToken(true);

      // Obtener el token con los claims
      const idTokenResult = await loggedInUser.getIdTokenResult();
      const customRole = idTokenResult.claims.role;

      console.log('Custom claim role:', customRole);

      // Obtener datos de Firestore
      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));

      if (!userDoc.exists()) {
        setError('No se encontró la información del usuario.');
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      const userData = userDoc.data();
      const firestoreRole = userData.role;
      const firestoreUserType = userData.userType;

      console.log('Firestore role:', firestoreRole);
      console.log('Firestore userType:', firestoreUserType);

      // Validar que el tipo de usuario seleccionado coincida
      const isProveedor = userType === 'Proveedor';
      const isAdmin = userType !== 'Proveedor';

      if (isProveedor && firestoreUserType !== 'Proveedor') {
        setError('Credenciales inválidas para el tipo de usuario seleccionado.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      if (isAdmin && firestoreUserType !== 'Administrador') {
        setError('Credenciales inválidas para el tipo de usuario seleccionado.');
        await auth.signOut();
        setLoading(false);
        return;
      }

      // Verificar acceso a la empresa seleccionada
      const { verificarAccesoEmpresa } = await import('@/app/actions/empresas');
      const accesoResult = await verificarAccesoEmpresa(loggedInUser.uid, empresaSeleccionada);
      
      console.log('🔍 Verificación de acceso:', accesoResult);
      
      if (!accesoResult.success || !accesoResult.hasAccess) {
        console.error('❌ Sin acceso a empresa:', empresaSeleccionada);
        setError('No tienes acceso a la empresa seleccionada.');
        await auth.signOut();
        setLoading(false);
        return;
      }
      
      console.log('✅ Acceso verificado para empresa:', empresaSeleccionada);

      // Guardar empresa seleccionada en contexto
      const empresaObj = empresasDisponibles.find(e => e.id === empresaSeleccionada);
      if (empresaObj) {
        setEmpresaContext(empresaObj);
      }

      toast({
        title: 'Inicio de sesión exitoso',
        description: `Bienvenido a ${empresaObj?.nombreComercial || 'la aplicación'}`,
      });

      // Redirigir según el rol
      if (firestoreRole === 'proveedor') {
        router.push('/proveedores/dashboard');
      } else {
        router.push('/dashboard');
      }
      
      setLoading(false);

    } catch (error: any) {
      console.error('Error en login:', error);
      let errorMessage = 'Ocurrió un error al iniciar sesión.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'El correo electrónico o la contraseña son incorrectos.';
      }
      setError(errorMessage);
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
          <CardDescription>
            Portal de Proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && <p className="text-red-500 text-center font-medium">{error}</p>}
            
            {/* Tipo de Usuario Selector */}
            <div className="space-y-2">
              <Label htmlFor="userType">Tipo de Usuario</Label>
              <Select onValueChange={setUserType} value={userType} disabled={loading}>
                  <SelectTrigger id="userType">
                      <SelectValue placeholder="Seleccione tipo de usuario" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="Proveedor">Proveedor</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
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
                disabled={loading}
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
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresaSeleccionada} onValueChange={setEmpresaSeleccionada} disabled={loading || loadingEmpresas}>
                    <SelectTrigger id="empresa">
                        <SelectValue placeholder={loadingEmpresas ? "Cargando empresas..." : "Seleccione una empresa"} />
                    </SelectTrigger>
                    <SelectContent>
                        {empresasDisponibles.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                                {empresa.nombreComercial}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" disabled={loading} />
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