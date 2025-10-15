import { Calendar as CalendarIcon, ListFilter, Search } from 'lucide-react';

import { invoices, suppliers } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusVariant = {
  Aprobada: 'success',
  'En Revisión': 'secondary',
  Rechazada: 'destructive',
  Pagada: 'default',
} as const;

type InvoiceStatus = keyof typeof statusVariant;

const getBadgeVariant = (status: InvoiceStatus) => {
    switch (status) {
        case 'Aprobada':
            return 'bg-green-500/20 text-green-200 border-green-500/30 hover:bg-green-500/30';
        case 'En Revisión':
            return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30';
        case 'Rechazada':
            return 'bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/30';
        case 'Pagada':
            return 'bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/30';
        default:
            return 'secondary';
    }
}


export default function FacturasPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <h1 className="text-3xl font-semibold">Gestión de Facturas</h1>
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <CardDescription>
              Refine los resultados de las facturas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rango de Fechas" className="pl-10" />
              </div>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="en-revision">En Revisión</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                </SelectContent>
              </Select>
               <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                    {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input placeholder="Número de Factura" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost">
                <ListFilter className="mr-2 h-4 w-4" />
                Limpiar Filtros
            </Button>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </CardFooter>
        </Card>

        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>No. Factura</TableHead>
                <TableHead>Fecha de Entrada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Acción</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.supplierName}</TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.entryDate}</TableCell>
                    <TableCell>
                    <Badge className={getBadgeVariant(invoice.status as InvoiceStatus)}>
                        {invoice.status}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                    }).format(invoice.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                    {invoice.actionable && (
                         <Button variant="outline" size="sm">Aprobar</Button>
                    )}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>

      </div>
    </main>
  );
}