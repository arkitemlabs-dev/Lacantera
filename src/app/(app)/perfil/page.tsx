
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="grid grid-cols-3 gap-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="col-span-2 font-medium">{value || '-'}</dd>
  </div>
);

export default function AdminProfilePage() {
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <h1 className="text-3xl font-semibold">Perfil de Administrador</h1>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Información de la Cuenta</CardTitle>
                <CardDescription>
                  Estos son los detalles de tu cuenta de administrador.
                </CardDescription>
              </div>
              <Button variant="outline">Editar Perfil</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex items-center gap-6">
               <Avatar className="h-24 w-24">
                {userAvatar && (
                    <Image
                    src={userAvatar.imageUrl}
                    alt={userAvatar.description}
                    width={96}
                    height={96}
                    className="rounded-full object-cover"
                    data-ai-hint={userAvatar.imageHint}
                    />
                )}
                <AvatarFallback>JP</AvatarFallback>
              </Avatar>
               <div className='flex-1'>
                <h2 className="text-2xl font-bold">Juan Pérez</h2>
                <p className="text-muted-foreground">Super Admin</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Datos Personales y de Contacto</h3>
              <div className="space-y-4">
                <InfoRow label="Nombre Completo" value="Juan Pérez" />
                <InfoRow label="Correo Electrónico" value="juan.perez@lacanteta.com" />
                <InfoRow label="Teléfono" value="55 1234 5678" />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Información de la Empresa</h3>
              <div className="space-y-4">
                <InfoRow label="Razón Social" value="La Cantera Desarrollos Mineros S.A. de C.V." />
                <InfoRow label="Rol Asignado" value="Super Admin" />
                 <InfoRow label="Contacto Adicional" value="No hay notas adicionales." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
