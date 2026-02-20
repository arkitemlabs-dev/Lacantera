
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { Loader2, Upload, X, FileCheck } from 'lucide-react';
import { uploadFile } from '@/app/actions/archivos';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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
  geolocalizacion: z.string().optional(),

  // Datos de contacto
  contactName: z.string().min(2, 'El nombre del contacto es requerido'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  whatsappPhone: z.string().optional(),

  // Información bancaria
  bankName: z.string().min(2, 'El nombre del banco es requerido'),
  bankAccount: z.string().min(10, 'La cuenta bancaria es requerida'),
});

const docsConfig = [
  { id: 'actaConstitutiva', label: 'Acta constitutiva y sus modificaciones (en caso de persona moral)' },
  { id: 'poderNotarial', label: 'Poder notarial del representante legal vigente inscrito ante el registro público de comercio (en caso de persona moral)' },
  { id: 'idRepresentante', label: 'Copia de identificación oficial vigente del representante legal (en caso de persona moral)' },
  { id: 'comprobanteDomicilio', label: 'Comprobante de domicilio fiscal actualizado (no mayor a 1 mes)' },
  { id: 'opinionSat', label: 'Opinión de cumplimiento del SAT' },
  { id: 'constanciaSituacion', label: 'Constancia de situación fiscal' },
  { id: 'caratulaBanco', label: 'Carátula del estado de cuenta bancaria (obligatoriamente con nombre del titular)' },
  { id: 'fotoDomicilio', label: 'Fotografía a color del exterior del domicilio fiscal y/o comercial' },
  { id: 'geolocalizacion', label: 'Geolocalización' },
  { id: 'referencias', label: 'Referencias comerciales' },
  { id: 'codigoEtica', label: 'Carta firmada de aceptación al código de ética' },
];

const arrendamientoDocsConfig = [
  { id: 'fotoInmueble', label: 'Fotografía del inmueble en arrendamiento interior y exterior' },
  { id: 'tituloPropiedad', label: 'Título de propiedad del inmueble arrendado (o documento que acredite la propiedad)' },
  { id: 'libertadGravamen', label: 'Certificado de libertad de gravamen' },
  { id: 'pagoPredial', label: 'Comprobante de pago de predial vigente' },
];

const serviciosDocsConfig = [
  { id: 'opinionImss', label: 'Opinión de cumplimiento del IMSS' },
  { id: 'opinionInfonavit', label: 'Opinión de cumplimiento del INFONAVIT' },
  { id: 'pagoImssInfonavit', label: 'Pago de IMSS e INFONAVIT' },
  { id: 'cedulaCuotas', label: 'Cédula de determinación de cuotas de IMSS e INFONAVIT' },
  { id: 'idTecnicos', label: 'Identificación oficial de los técnicos o personas que prestarán el servicio dentro de nuestras instalaciones' },
  { id: 'dc3', label: 'DC3 de los técnicos o personas que prestarán el servicio' },
  { id: 'certificaciones', label: 'Certificaciones' },
  { id: 'repseServicios', label: 'Registro en el REPSE (vigente)' },
];

const transporteDocsConfig = [
  { id: 'opinionImssTransp', label: 'Opinión de cumplimiento del IMSS' },
  { id: 'opinionInfonavitTransp', label: 'Opinión de cumplimiento del INFONAVIT' },
  { id: 'pagoImssInfonavitTransp', label: 'Pago de IMSS e INFONAVIT' },
  { id: 'cedulaCuotasTransp', label: 'Cédula de determinación de cuotas de IMSS e INFONAVIT' },
  { id: 'polizaSeguro', label: 'Póliza de seguro de responsabilidad civil vigente' },
  { id: 'repseTransp', label: 'Registro en el REPSE vigente' },
  { id: 'verificacionVehicular', label: 'Verificación vehicular vigente' },
  { id: 'tarjetaCirculacion', label: 'Tarjeta de circulación de cada unidad vigente' },
  { id: 'permisoSct', label: 'Permiso de la Secretaría de Comunicaciones y Transportes (SCT) vigente' },
  { id: 'registroChoferes', label: 'Registro de choferes asignados al servicio (nombres, identificación oficial, carta de no antecedentes penales)' },
  { id: 'licenciaConducir', label: 'Licencia de conducir vigente de cada chofer asignado al servicio de Cantera' },
  { id: 'listaUnidades', label: 'Lista de unidades asignadas al servicio (póliza, marca, modelo, placas, año, número de asientos)' },
  { id: 'repuve', label: 'Reporte de REPUVE' },
  { id: 'fotoVehiculos', label: 'Fotografía 4 frentes de cada vehículo para servicio de La Cantera incluyendo placas' },
];

function DocTable({
  docs,
  stagedFiles,
  onFileSelect,
  onRemove,
}: {
  docs: { id: string; label: string }[];
  stagedFiles: Map<string, File>;
  onFileSelect: (docId: string, file: File) => void;
  onRemove: (docId: string) => void;
}) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead className="text-right w-48">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map(doc => {
          const staged = stagedFiles.get(doc.id);
          return (
            <TableRow key={doc.id}>
              <TableCell className="font-medium text-sm py-3">{doc.label}</TableCell>
              <TableCell className="text-right py-3">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  ref={el => { if (el) inputRefs.current.set(doc.id, el); }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelect(doc.id, file);
                    e.target.value = '';
                  }}
                />
                {staged ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="flex items-center gap-1 text-xs text-green-600 max-w-[140px] truncate">
                      <FileCheck className="h-3 w-3 shrink-0" />
                      {staged.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(doc.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => inputRefs.current.get(doc.id)?.click()}
                  >
                    <Upload className="h-3 w-3 mr-2" />
                    Subir
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddSupplierForm() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const { crearProveedor, saving, error } = useProveedorAdmin();
  const [stagedFiles, setStagedFiles] = useState<Map<string, File>>(new Map());
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const handleFileSelect = (docId: string, file: File) => {
    setStagedFiles(prev => new Map(prev).set(docId, file));
  };

  const handleRemoveFile = (docId: string) => {
    setStagedFiles(prev => {
      const next = new Map(prev);
      next.delete(docId);
      return next;
    });
  };

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
      geolocalizacion: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      whatsappPhone: '',
      bankName: '',
      bankAccount: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const proveedorData: FormProveedorAdmin = {
        nombre: values.name.trim(),
        nombreCorto: values.name.substring(0, 20).trim(),
        rfc: values.taxId.toUpperCase().trim(),
        direccion: values.street.trim(),
        numeroExterior: values.numExt.trim(),
        numeroInterior: values.numInt?.trim() || '',
        colonia: values.colonia.trim(),
        ciudad: values.city.trim(),
        estado: values.state.trim(),
        pais: values.country?.trim() || 'México',
        codigoPostal: values.postalCode.trim(),
        dirInternet: values.geolocalizacion?.trim() || '',
        contactoPrincipal: values.contactName.trim(),
        email1: values.contactEmail.toLowerCase().trim(),
        telefonos: values.contactPhone.trim(),
        fax: values.whatsappPhone?.trim() || '',
        banco: values.bankName.trim(),
        cuentaBancaria: values.bankAccount.trim(),
        empresa: (session?.user as any)?.empresaActual || 'la-cantera-test',
        activo: true,
      };

      const success = await crearProveedor(proveedorData);

      if (success) {
        // Subir documentos staged si hay alguno
        if (stagedFiles.size > 0) {
          setUploadingDocs(true);
          const rfc = values.taxId.toUpperCase().trim();
          const resultados = await Promise.allSettled(
            Array.from(stagedFiles.entries()).map(async ([docId, file]) => {
              const base64 = await fileToBase64(file);
              return uploadFile({
                file: base64,
                fileName: file.name,
                fileType: file.type,
                folder: `proveedores/registro/${rfc}/${docId}`,
              });
            })
          );
          setUploadingDocs(false);

          const fallidos = resultados.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
          if (fallidos > 0) {
            toast({
              title: 'Proveedor guardado con advertencias',
              description: `${stagedFiles.size - fallidos} de ${stagedFiles.size} documentos subidos. Algunos fallaron.`,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Proveedor Guardado',
              description: `El proveedor ${values.name} y sus ${stagedFiles.size} documentos han sido guardados exitosamente.`,
            });
          }
        } else {
          toast({
            title: 'Proveedor Guardado',
            description: `El proveedor ${values.name} ha sido guardado exitosamente.`,
          });
        }
        form.reset();
        setStagedFiles(new Map());
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="informacion">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="informacion">Información General</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          {/* ── TAB: INFORMACIÓN GENERAL ── */}
          <TabsContent value="informacion" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>Información del Proveedor</CardTitle>
                  <CardDescription>Completa el formulario para registrar un nuevo proveedor.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
                  <Button type="submit" disabled={saving || uploadingDocs}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : uploadingDocs ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo documentos...
                      </>
                    ) : (
                      'Guardar Proveedor'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">

                {/* Datos Fiscales */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Datos Fiscales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>

                <Separator />

                {/* Dirección Fiscal */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Dirección Fiscal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="geolocalizacion"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Geolocalización</FormLabel>
                          <FormControl>
                            <Input placeholder="https://maps.google.com/... o coordenadas (lat, lng)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Datos de Contacto */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="whatsappPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono de Contacto con WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="55 1234 5678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Información Bancaria */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB: DOCUMENTOS ── */}
          <TabsContent value="documentos" className="mt-6 space-y-6">

            <Card>
              <CardHeader>
                <CardTitle>I. Documentación Base</CardTitle>
                <CardDescription>Requerida para todos los proveedores.</CardDescription>
              </CardHeader>
              <CardContent>
                <DocTable docs={docsConfig} stagedFiles={stagedFiles} onFileSelect={handleFileSelect} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>II. Proveedores de Arrendamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <DocTable docs={arrendamientoDocsConfig} stagedFiles={stagedFiles} onFileSelect={handleFileSelect} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>III. Proveedores de Servicios</CardTitle>
              </CardHeader>
              <CardContent>
                <DocTable docs={serviciosDocsConfig} stagedFiles={stagedFiles} onFileSelect={handleFileSelect} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>IV. Proveedores de Transporte</CardTitle>
              </CardHeader>
              <CardContent>
                <DocTable docs={transporteDocsConfig} stagedFiles={stagedFiles} onFileSelect={handleFileSelect} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
