
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Search, Eye, ListFilter } from 'lucide-react';
import { suppliers } from '@/lib/data';
import type { Supplier, SupplierStatus, SupplierType } from '@/lib/types';

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
import { cn } from '@/lib/utils';

const statusStyles: Record<
  SupplierStatus,
  { variant: 'default' | 'destructive' | 'secondary' | 'outline', className: string }
> = {
  active: { variant: 'default', className: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800' },
  inactive: { variant: 'destructive', className: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 hover:bg-red-500/30 bg-red-100 text-red-800' },
  pending: { variant: 'secondary', className: '' },
  attention: { variant: 'destructive', className: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800' },
  review: { variant: 'outline', className: 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/30 bg-blue-100 text-blue-800' },
};


const statusText: Record<SupplierStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  attention: 'Atención',
  review: 'En revisión',
};

const typeText: Record<SupplierType, string> = {
  supplies: 'Suministros',
  services: 'Servicios',
  leasing: 'Arrendamiento',
  transport: 'Transporte',
};

export default function ProveedoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const displayedSuppliers = useMemo(() => {
    return suppliers
      .filter(s => s.status !== 'pending')
      .filter((supplier) => {
        const searchFilter =
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.taxId.toLowerCase().includes(searchTerm.toLowerCase());
        const status = statusFilter === 'all' || supplier.status === statusFilter;
        const type = typeFilter === 'all' || supplier.type === typeFilter;
        return searchFilter && status && type;
      });
  }, [searchTerm, statusFilter, typeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

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
            <CardDescription>
              Refine su búsqueda de proveedores.
            </CardDescription>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Input
                placeholder="Buscar por nombre o RFC..."
                className="max-w-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                  <SelectItem value="attention">Requiere atención</SelectItem>
                  <SelectItem value="review">En revisión</SelectItem>
                </SelectContent>
              </Select>
               <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo de proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="supplies">Suministros</SelectItem>
                  <SelectItem value="services">Servicios</SelectItem>
                  <SelectItem value="leasing">Arrendamiento</SelectItem>
                  <SelectItem value="transport">Transporte</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                <ListFilter className="mr-2 h-4 w-4" />
                Limpiar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <Link href={`/proveedores/${supplier.id}`} className="hover:underline">
                        {supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell>{supplier.contactName}</TableCell>
                    <TableCell>{typeText[supplier.type]}</TableCell>
                    <TableCell>{supplier.registrationDate}</TableCell>
                    <TableCell>
                      <Badge variant={statusStyles[supplier.status].variant} className={cn(statusStyles[supplier.status].className)}>
                        {statusText[supplier.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                           <Link href={`/proveedores/${supplier.id}`}>
                             <Eye className="h-4 w-4" />
                             <span className="sr-only">Ver Detalles</span>
                           </Link>
                         </Button>
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
                            <DropdownMenuItem>
                              {supplier.status === 'active' ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
