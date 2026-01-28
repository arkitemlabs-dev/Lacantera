
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Badge,
  CheckCircle2,
  File as FileIcon,
  Loader2,
  Upload,
  XCircle,
  FileText,
  Building,
  Truck,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
// TODO: Implementar addSupplier usando SQL Server
// import { addSupplier } from '@/lib/firebase/firestore';

const formSchema = z.object({
  // Datos fiscales
  name: z.string().min(2, 'El nombre es requerido'),
  taxId: z.string().min(10, 'El RFC/Tax ID es requerido'),
  address: z.string().min(5, 'La dirección es requerida'),
  
  // Datos de contacto
  contactName: z.string().min(2, 'El nombre del contacto es requerido'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  
  // Información bancaria
  bankName: z.string().min(2, 'El nombre del banco es requerido'),
  bankAccount: z.string().min(10, 'La cuenta bancaria es requerida'),
  bankClabe: z.string().length(18, 'La CLABE debe tener 18 dígitos'),

  // Descripción
  description: z.string().optional(),
});


const complementaryDocsConfig = [
    { id: 'poderNotarial', label: 'Poder notarial del representante legal', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'opinionSat', label: 'Opinión de cumplimiento positiva del SAT (vigencia mensual)', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'actaConstitutiva', label: 'Acta constitutiva y sus modificaciones', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'caratulaBanco', label: 'Carátula del estado de cuenta bancaria', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'fotoDomicilio', label: 'Fotografía a color del exterior del domicilio fiscal/comercial', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'referencias', label: 'Referencias comerciales', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'codigoEtica', label: 'Carta firmada de aceptación al código de ética', required: true, types: ['supplies', 'services', 'leasing', 'transport'] },
    { id: 'repse', label: 'Registro en el REPSE (Solo si aplica)', required: true, types: ['services'] },
    { id: 'tituloPropiedad', label: 'Título de propiedad del inmueble arrendado o documento que acredite propiedad (Solo si aplica)', required: true, types: ['leasing'] },
    { id: 'pagoPredial', label: 'Comprobante de pago de predial vigente (Solo si aplica)', required: true, types: ['leasing'] },
    { id: 'polizaSeguro', label: 'Póliza de seguro de responsabilidad civil vigente (Solo si aplica)', required: true, types: ['transport'] },
];

export function AddSupplierForm() {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      taxId: '',
      address: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      bankName: '',
      bankAccount: '',
      bankClabe: '',
      description: '',
    },
  });


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // TODO: Implementar con SQL Server
      console.log('Datos del proveedor:', values);
      toast({
        title: 'Función no disponible',
        description: 'La creación de proveedores desde el portal aún no está implementada.',
        variant: 'destructive',
      });
      // await addSupplier(values);
      // toast({
      //   title: 'Proveedor Guardado',
      //   description: `El proveedor ${values.name} ha sido guardado exitosamente.`,
      // });
      // form.reset();
    } catch (error) {
      console.error('Error al guardar el proveedor:', error);
      toast({
        title: 'Error',
        description: 'Hubo un problema al guardar el proveedor. Por favor, intenta de nuevo.',
        variant: 'destructive',
      });
    }
  }

  const renderFileUpload = (label: string) => (
     <div className="space-y-2">
        <FormLabel>{label}</FormLabel>
        <div className="relative border-2 border-dashed border-muted rounded-lg p-4 flex items-center justify-center text-center h-24">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="ml-2 text-xs text-muted-foreground">
            Arrastra o haz clic para subir
            </p>
            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Datos Fiscales</CardTitle>
                <CardDescription>Esta información será validada contra el SAT.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón Social (Nombre del Proveedor)</FormLabel>
                      <FormControl>
                        <Input placeholder="Aceros del Norte S.A. de C.V." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RFC / Tax ID</FormLabel>
                      <FormControl>
                        <Input placeholder="XAXX010101000" {...field} />
                      </FormControl>
                       <FormDescription>Se validará que el RFC no esté duplicado.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección Fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Siempre Viva 123, Springfield" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datos de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Contacto Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="contacto@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="55 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información Bancaria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Banco</FormLabel>
                      <FormControl>
                        <Input placeholder="Banco Nacional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Cuenta</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankClabe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CLABE Interbancaria</FormLabel>
                      <FormControl>
                        <Input placeholder="012345678901234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Categoría y Documentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                    <h3 className="text-sm font-medium mb-4">Documentos Iniciales</h3>
                    <div className="space-y-4">
                        {renderFileUpload('INE del representante legal')}
                        {renderFileUpload('Comprobante de domicilio fiscal')}
                        {renderFileUpload('Constancia de situación fiscal (CSF)')}
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Documentación Complementaria</CardTitle>
                    <CardDescription>
                        Sube los documentos requeridos según el tipo de proveedor.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complementaryDocsConfig.map(doc => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium text-xs py-2">{doc.label}</TableCell>
                                    <TableCell className="text-right py-2">
                                        <Button type="button" variant="outline" size="sm" className="h-8">
                                            <Upload className="h-3 w-3 mr-2" />
                                            Subir
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-8">
          <Button type="button" variant="outline">Cancelar</Button>
          <Button type="submit">Guardar Proveedor</Button>
        </div>
      </form>
    </Form>
  );
}

    
