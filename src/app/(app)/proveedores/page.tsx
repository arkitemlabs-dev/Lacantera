import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { suppliers } from '@/lib/data';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusVariant = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
  attention: 'destructive',
} as const;

const statusText = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    attention: 'Atención'
}

export default function ProveedoresPage() {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>
            <p className="text-muted-foreground">
              Administre, agregue o edite la información de sus proveedores.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link href="/proveedores/nuevo">
              <PlusCircle className="h-4 w-4" />
              Agregar Proveedor
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtrar Proveedores</CardTitle>
            <CardDescription>Refine su búsqueda de proveedores.</CardDescription>
            <div className="mt-4 flex items-center gap-4">
              <Input
                placeholder="Buscar por nombre o RFC..."
                className="max-w-xs"
              />
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="attention">Requiere Atención</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.contactName}</TableCell>
                    <TableCell>{supplier.registrationDate}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[supplier.status]}>
                        {statusText[supplier.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
