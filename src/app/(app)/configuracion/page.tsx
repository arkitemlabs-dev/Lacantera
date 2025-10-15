import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const users = [
  {
    name: 'Juan Pérez',
    email: 'admin@lacantora.com',
    role: 'Administrador',
  },
  {
    name: 'Ana García',
    email: 'ana.garcia@lacantora.com',
    role: 'Contador',
  },
  {
    name: 'Luis Hernández',
    email: 'luis.hernandez@lacantora.com',
    role: 'Gerente de Compras',
  },
];

export default function ConfiguracionPage() {
  return (
    <>
      <Header title="Configuración" />
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Configuración</h1>
        </div>
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
          <Tabs defaultValue="company" orientation="vertical" className="w-full">
            <TabsList className="flex flex-col h-full bg-transparent p-0 items-start">
              <TabsTrigger value="company" className="w-full justify-start">
                Información de la empresa
              </TabsTrigger>
              <TabsTrigger value="users" className="w-full justify-start">
                Gestión de usuarios
              </TabsTrigger>
              <TabsTrigger value="docs" className="w-full justify-start">
                Requisitos de documentos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="company" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la empresa</CardTitle>
                  <CardDescription>
                    Actualiza la información legal y de contacto de tu empresa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nombre de la Empresa</Label>
                    <Input id="name" defaultValue="La Cantera" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email de Contacto</Label>
                    <Input id="email" defaultValue="contacto@lacantora.com" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="taxId">RFC / Tax ID</Label>
                    <Input id="taxId" defaultValue="LCA010101XYZ" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Guardar Cambios</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de usuarios</CardTitle>
                  <CardDescription>
                    Administra los usuarios y roles del sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => (
                        <TableRow key={user.email}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Requisitos de documentos</CardTitle>
                  <CardDescription>
                    Define los requisitos que la IA usará para verificar los documentos de los proveedores.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    className="min-h-48"
                    defaultValue="El documento debe ser un PDF. Debe incluir el nombre de la empresa, RFC (Registro Federal de Contribuyentes), y domicilio fiscal. El documento no debe tener más de 1 año de antigüedad."
                  />
                </CardContent>
                 <CardFooter>
                  <Button>Guardar Requisitos</Button>
                </CardFooter>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </>
  );
}
