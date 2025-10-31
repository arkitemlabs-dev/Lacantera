
'use client';

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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

const sessionHistory = [
  {
    date: '2024-07-26 10:00 AM',
    ip: '192.168.1.100',
    location: 'Querétaro, MX',
  },
  {
    date: '2024-07-25 03:15 PM',
    ip: '201.150.33.12',
    location: 'Ciudad de México, MX',
  },
  {
    date: '2024-07-24 09:30 AM',
    ip: '192.168.1.100',
    location: 'Querétaro, MX',
  },
];

export default function SeguridadProveedorPage() {
  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="text-foreground">Seguridad</span>
      </div>

      <div className="space-y-8">
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
            <CardDescription>
              Para su seguridad, le recomendamos utilizar una contraseña segura
              que no utilice en otros sitios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                id="current-password"
                type="password"
                className="bg-background/40"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="bg-background/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className="bg-background/40"
                />
              </div>
            </div>
             <div className="flex justify-end">
                <Button>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Autenticación de Dos Factores</CardTitle>
              <CardDescription>
                Añada una capa extra de seguridad a su cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="2fa-switch" className="font-medium">
                    Activar 2FA
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Se le pedirá un código de verificación al iniciar sesión.
                  </p>
                </div>
                <Switch id="2fa-switch" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/70">
            <CardHeader>
              <CardTitle>Recuperación de Contraseña</CardTitle>
              <CardDescription>
                Gestione su correo electrónico de recuperación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">
                  Correo Electrónico de Recuperación
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  defaultValue="shirley.h@proveedor.com"
                  className="bg-background/40"
                />
              </div>
              <Button>Actualizar Correo</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle>Historial de Inicio de Sesión</CardTitle>
            <CardDescription>
              Revise los inicios de sesión recientes en su cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Dirección IP</TableHead>
                  <TableHead>Ubicación (Aproximada)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionHistory.map((session, index) => (
                  <TableRow key={index}>
                    <TableCell>{session.date}</TableCell>
                    <TableCell>{session.ip}</TableCell>
                    <TableCell>{session.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
