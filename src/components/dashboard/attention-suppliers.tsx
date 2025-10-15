import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AttentionSuppliers() {
  const attentionSuppliers = suppliers.filter(
    (s) => s.status === 'attention' || s.status === 'pending'
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Proveedores que Requieren Atención</CardTitle>
          <CardDescription>
            Proveedores con registro pendiente o documentos faltantes.
          </CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/proveedores">
            Ver Todos
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Fecha Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attentionSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="font-medium">{supplier.name}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {supplier.contactEmail}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant={
                      supplier.status === 'attention' ? 'destructive' : 'secondary'
                    }
                  >
                    {supplier.status === 'attention' ? 'Atención' : 'Pendiente'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {supplier.registrationDate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
