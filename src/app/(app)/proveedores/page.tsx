'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Eye, ListFilter, Loader2, UserCheck, UserX, ChevronLeft, ChevronRight, KeyRound, Copy, Check } from 'lucide-react';
import type { SupplierStatus, SupplierType } from '@/lib/types';
import { getProveedores } from '@/app/actions/proveedores';
import { useToast } from '@/hooks/use-toast';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ProveedorDetailsModal } from '@/components/proveedores/proveedor-details-modal';

const ITEMS_PER_PAGE = 10;

const statusStyles: Record<
  SupplierStatus,
  { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [registroFilter, setRegistroFilter] = useState('all'); // Nuevo filtro para estado de registro
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset password state
  const [resetConfirmProveedor, setResetConfirmProveedor] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; email: string; nombre: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setLoading(true);
    console.log('🔍 Cargando proveedores...');
    const result = await getProveedores();
    console.log('📦 Resultado:', result);

    if (result.success) {
      console.log('✅ Proveedores cargados:', result.data);
      console.log("🔍 Primer proveedor:", result.data[0]);
      setProveedores(result.data || []);
    } else {
      console.error('❌ Error cargando proveedores:', result.error);
    }
    setLoading(false);
  };
  
  // Proveedores filtrados (sin paginación) - ordenados alfabéticamente
  const filteredSuppliers = useMemo(() => {
    return proveedores
      .filter((supplier) => {
        const searchFilter =
          supplier.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.rfc?.toLowerCase().includes(searchTerm.toLowerCase());
        const status = statusFilter === 'all' || supplier.status === statusFilter;
        const type = typeFilter === 'all' || supplier.tipoProveedor === typeFilter;
        // Filtro de registro en portal
        const registro =
          registroFilter === 'all' ||
          (registroFilter === 'registrado' && supplier.registradoEnPortal === true) ||
          (registroFilter === 'no_registrado' && supplier.registradoEnPortal === false);
        return searchFilter && status && type && registro;
      })
      .sort((a, b) => {
        const nombreA = (a.razonSocial || '').trim().toLowerCase();
        const nombreB = (b.razonSocial || '').trim().toLowerCase();
        return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
      });
  }, [proveedores, searchTerm, statusFilter, typeFilter, registroFilter]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);

  // Proveedores de la página actual
  const displayedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, currentPage]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, registroFilter]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = proveedores.length;
    const registrados = proveedores.filter(p => p.registradoEnPortal === true).length;
    const noRegistrados = proveedores.filter(p => p.registradoEnPortal === false).length;
    return { total, registrados, noRegistrados };
  }, [proveedores]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setRegistroFilter('all');
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleResetPassword = async () => {
    if (!resetConfirmProveedor?.uid) return;
    setResetLoading(true);
    try {
      const res = await fetch(
        `/api/admin/proveedores/${resetConfirmProveedor.codigoERP}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portalUserId: resetConfirmProveedor.uid }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setResetResult({ tempPassword: data.tempPassword, email: data.email, nombre: data.nombre });
        setResetConfirmProveedor(null);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error || 'No se pudo resetear la contraseña' });
        setResetConfirmProveedor(null);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Error de conexión al resetear la contraseña' });
      setResetConfirmProveedor(null);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult?.tempPassword) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

        {/* Tarjetas de estadísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">En el sistema ERP</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Registrados en Portal</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.registrados}</div>
              <p className="text-xs text-muted-foreground">Con acceso al portal</p>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Sin Registrar</CardTitle>
              <UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.noRegistrados}</div>
              <p className="text-xs text-muted-foreground">Pendientes de registro</p>
            </CardContent>
          </Card>
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
              <Select value={registroFilter} onValueChange={setRegistroFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Estado de registro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  <SelectItem value="registrado">Registrados en portal</SelectItem>
                  <SelectItem value="no_registrado">Sin registrar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado ERP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pendiente_validacion">Pendiente</SelectItem>
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
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : displayedSuppliers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No se encontraron proveedores.
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Portal</TableHead>
                      <TableHead>Nombre del Proveedor</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead>Estado ERP</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedSuppliers.map((supplier) => (
                      <TableRow
                        key={supplier.uid}
                        className={cn(
                          !supplier.registradoEnPortal && "bg-orange-50/50 dark:bg-orange-950/10"
                        )}
                      >
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                {supplier.registradoEnPortal ? (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                                    <UserX className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {supplier.registradoEnPortal
                                ? "Registrado en el portal"
                                : "Sin registro en el portal"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Link
                                  href={`/proveedores/perfil?id=${supplier.codigoERP || supplier.uid}`}
                                  className={cn(
                                    "hover:underline",
                                    !supplier.registradoEnPortal && "text-muted-foreground"
                                  )}
                                >
                                  {supplier.razonSocial}
                                </Link>
                                {supplier.codigoERP && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({supplier.codigoERP})
                                  </span>
                                )}
                                {supplier.empresasAsignadas && supplier.empresasAsignadas.length > 0 && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {supplier.empresasAsignadas.map(e => e.empresaName).join(', ')}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <div className="space-y-1">
                                <div><strong>Código ERP:</strong> {supplier.codigoERP || 'N/A'}</div>
                                {supplier.erpDatos?.categoria && (
                                  <div><strong>Categoría:</strong> {supplier.erpDatos.categoria}</div>
                                )}
                                {supplier.erpDatos?.condicionPago && (
                                  <div><strong>Condición de Pago:</strong> {supplier.erpDatos.condicionPago}</div>
                                )}
                                {supplier.erpDatos?.formaPago && (
                                  <div><strong>Forma de Pago:</strong> {supplier.erpDatos.formaPago}</div>
                                )}
                                {supplier.erpDatos?.situacion && (
                                  <div><strong>Situación:</strong> {supplier.erpDatos.situacion}</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{supplier.rfc || "-"}</TableCell>
                        <TableCell>
                          <div>
                            {supplier.email || "-"}
                            {supplier.erpDatos?.email2 && (
                              <div className="text-xs text-muted-foreground">
                                {supplier.erpDatos.email2}
                              </div>
                            )}
                            {supplier.telefono && (
                              <div className="text-xs text-muted-foreground">
                                Tel: {supplier.telefono}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.registradoEnPortal && supplier.fechaRegistroPortal ? (
                            <span className="text-green-600 dark:text-green-400">
                              {new Date(supplier.fechaRegistroPortal).toLocaleDateString("es-MX")}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300">
                              Sin registrar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={supplier.status === 'activo' ? 'default' : 'secondary'}
                            className={cn(
                              supplier.status === 'activo'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            )}
                          >
                            {supplier.status === 'activo' ? 'Alta' : 'Baja'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/proveedores/perfil?id=${supplier.codigoERP || supplier.uid}`}>
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
                                <DropdownMenuItem asChild>
                                  <Link href={`/proveedores/perfil?id=${supplier.codigoERP || supplier.uid}`}>
                                    Ver perfil completo
                                  </Link>
                                </DropdownMenuItem>
                                {supplier.registradoEnPortal ? (
                                  <>
                                    <DropdownMenuItem>
                                      {supplier.status === "activo" ? "Desactivar" : "Activar"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-amber-600 focus:text-amber-600"
                                      onSelect={() => setResetConfirmProveedor(supplier)}
                                    >
                                      <KeyRound className="mr-2 h-4 w-4" />
                                      Resetear contraseña
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem>Invitar al portal</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}

            {/* Paginación */}
            {!loading && filteredSuppliers.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredSuppliers.length)} de {filteredSuppliers.length} proveedores
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {/* Mostrar números de página */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Mostrar primera, última, actual y adyacentes
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        // Agregar puntos suspensivos si hay salto
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <ProveedorDetailsModal
        proveedor={selectedProveedor}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />

      {/* Confirmación de reset de contraseña */}
      <AlertDialog
        open={!!resetConfirmProveedor}
        onOpenChange={(open) => { if (!open) setResetConfirmProveedor(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Resetear contraseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Se generará una contraseña temporal para{' '}
              <strong>{resetConfirmProveedor?.razonSocial}</strong>. La contraseña
              actual quedará invalidada de inmediato. Deberás comunicarle la nueva
              contraseña al proveedor manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {resetLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reseteando...</>
              ) : (
                'Sí, resetear contraseña'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resultado: contraseña temporal generada */}
      <Dialog open={!!resetResult} onOpenChange={(open) => { if (!open) { setResetResult(null); setCopied(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña temporal generada</DialogTitle>
            <DialogDescription>
              La contraseña de <strong>{resetResult?.nombre}</strong> ha sido reseteada.
              Comparte esta contraseña temporal con el proveedor ({resetResult?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted px-4 py-3">
            <code className="flex-1 text-lg font-mono tracking-widest select-all">
              {resetResult?.tempPassword}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyPassword}
              title="Copiar contraseña"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta contraseña solo se muestra una vez. El proveedor deberá cambiarla al ingresar.
          </p>
          <DialogFooter>
            <Button onClick={() => { setResetResult(null); setCopied(false); }}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
