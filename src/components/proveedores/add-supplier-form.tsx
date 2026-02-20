
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useProveedorAdmin } from '@/hooks/useProveedorAdmin';
import type { FormProveedorAdmin } from '@/types/admin-proveedores';

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

const formSchema = z.object({
  // Datos fiscales
  name: z.string().min(2, 'El nombre es requerido'),
  taxId: z.string()
    .min(12, 'El RFC debe tener al menos 12 caracteres')
    .max(13, 'El RFC debe tener máximo 13 caracteres')
    .regex(
      /^[A-Za-z]{3,4}[0-9]{6}[A-Za-z0-9]{3}$/,
      'RFC inválido. Formato: 3-4 letras + 6 dígitos + 3 caracteres (ej: ABC123456XY9)'
    ),

  // Dirección fiscal
  street: z.string().min(3, 'La calle es requerida'),
  numExt: z.string().min(1, 'El número exterior es requerido'),
  numInt: z.string().optional(),
  colonia: z.string().min(2, 'La colonia es requerida'),
  city: z.string().min(2, 'La ciudad es requerida'),
  state: z.string().min(2, 'El estado es requerido'),
  country: z.string().optional(),
  postalCode: z.string().min(5, 'El código postal debe tener 5 dígitos').max(5, 'El código postal debe tener 5 dígitos'),

  // Datos de contacto
  contactName: z.string().min(2, 'El nombre del contacto es requerido'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),

  // Información bancaria
  bankName: z.string().min(2, 'El nombre del banco es requerido'),
  bankAccount: z.string().min(10, 'La cuenta bancaria es requerida'),
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
  const { data: session } = useSession();
  const { crearProveedor, saving, error } = useProveedorAdmin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      taxId: '',
      street: '',
      numExt: '',
      numInt: '',
      colonia: '',
      city: '',
      state: '',
      country: 'México',
      postalCode: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      bankName: '',
      bankAccount: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Mapear los datos del formulario al formato esperado por la API
      const proveedorData: FormProveedorAdmin = {
        nombre: values.name.trim(),
        nombreCorto: values.name.substring(0, 20).trim(),
        rfc: values.taxId.toUpperCase().trim(), // RFC debe ser mayúsculas
        // Dirección
        direccion: values.street.trim(),
        numeroExterior: values.numExt.trim(),
        numeroInterior: values.numInt?.trim() || '',
        colonia: values.colonia.trim(),
        ciudad: values.city.trim(),
        estado: values.state.trim(),
        pais: values.country?.trim() || 'México',
        codigoPostal: values.postalCode.trim(),
        // Contacto
        contactoPrincipal: values.contactName.trim(),
        email1: values.contactEmail.toLowerCase().trim(), // Email en minúsculas
        telefonos: values.contactPhone.trim(),
        // Bancario
        banco: values.bankName.trim(),
        cuentaBancaria: values.bankAccount.trim(),
        empresa: (session?.user as any)?.empresaActual || 'la-cantera-test',
        activo: true,
      };

      console.log('Creando proveedor:', proveedorData);

      const success = await crearProveedor(proveedorData);

      if (success) {
        toast({
          title: 'Proveedor Guardado',
          description: `El proveedor ${values.name} ha sido guardado exitosamente.`,
        });
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: error || 'Hubo un problema al guardar el proveedor.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error al guardar el proveedor:', err);
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
                      <FormLabel>RFC</FormLabel>
                      <FormControl>
                        <Input placeholder="XAXX010101000" {...field} />
                      </FormControl>
                      <FormDescription>Se validará que el RFC no esté duplicado.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dirección Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calle</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Reforma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numExt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número Exterior</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numInt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número Interior</FormLabel>
                        <FormControl>
                          <Input placeholder="4-A (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="colonia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colonia</FormLabel>
                      <FormControl>
                        <Input placeholder="Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad / Población</FormLabel>
                        <FormControl>
                          <Input placeholder="Ciudad de México" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="CDMX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input placeholder="06600" maxLength={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl>
                          <Input placeholder="México" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                      <FormLabel>Número de Cuenta o CLABE</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789" {...field} />
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
          <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Proveedor'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


