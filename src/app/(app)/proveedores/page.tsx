import Link from 'next/link';
import { MoreHorizontal, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { suppliers } from '@/lib/data';
import { Header } from '@/components/header';

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

const statusVariant = {
  active: 'default',
  pending: 'secondary',
  attention: 'destructive',
} as const;

export default function ProveedoresPage() {
  return (
    <>
      <Header title="Gestión de Proveedores" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Proveedores</CardTitle>
                <CardDescription>
                  Gestiona los proveedores de tu empresa.
                </CardDescription>
              </div>
              <Button asChild size="sm" className="gap-1">
                <Link href="/proveedores/nuevo">
                  <PlusCircle className="h-4 w-4" />
                  Agregar Proveedor
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Gastado
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Fecha de Registro
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {supplier.contactEmail}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusVariant[supplier.status]}>
                        {supplier.status.charAt(0).toUpperCase() +
                          supplier.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center">
                        <span>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(supplier.spent)}
                        </span>
                        {supplier.trend > 0 ? (
                          <ArrowUp className="h-4 w-4 ml-2 text-green-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 ml-2 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {supplier.registrationDate}
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
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Eliminar</DropdownMenuItem>
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
