
'use client';

import { useState } from 'react';
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
import { Eye, EyeOff, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [userType, setUserType] = useState('admin');
  const logo = PlaceHolderImages.find((img) => img.id === 'login-logo');
  const bgImage = PlaceHolderImages.find((img) => img.id === 'login-background');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const dashboardUrl = userType === 'admin' ? '/dashboard' : '/proveedores/dashboard';
    router.push(dashboardUrl);
  };

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
            <div className="space-y-2">
                <Label htmlFor="userType">Tipo de Usuario</Label>
                <Select value={userType} onValueChange={setUserType}>
                    <SelectTrigger id="userType">
                        <SelectValue placeholder="Seleccione un tipo de usuario" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supplier">Proveedor</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email / Usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder={userType === 'admin' ? "admin@lacantora.com" : "contacto@proveedor.com"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  defaultValue="••••••••••••"
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
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Iniciar sesión
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
