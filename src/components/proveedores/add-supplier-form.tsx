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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supplierComplianceCheck } from '@/ai/flows/supplier-compliance-check';
import { generateSupplierDescription } from '@/ai/flows/generate-supplier-description';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

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

  // Categorías
  supplierType: z.enum(['supplies', 'services', 'leasing', 'transport'], {
    required_error: 'Debe seleccionar un tipo de proveedor',
  }),

  // Descripción
  description: z.string().optional(),
});

type ComplianceResult = {
  isCompliant: boolean;
  complianceReport: string;
};

export function AddSupplierForm() {
  const { toast } = useToast();
  const [document, setDocument] = useState<File | null>(null);
  const [documentDataUri, setDocumentDataUri] = useState<string | null>(null);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  
  const documentRequirements =
    'El documento debe ser un PDF. Debe incluir el nombre de la empresa, RFC (Registro Federal de Contribuyentes), y domicilio fiscal. El documento no debe tener más de 1 año de antigüedad.';

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDocument(file);
      setComplianceResult(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUri = e.target?.result as string;
        setDocumentDataUri(dataUri);
        await checkCompliance(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkCompliance = async (dataUri: string) => {
    setIsCheckingCompliance(true);
    try {
      const result = await supplierComplianceCheck({
        documentDataUri: dataUri,
        documentRequirements,
      });
      setComplianceResult(result);
    } catch (error) {
      console.error('Compliance check failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Verificación',
        description: 'No se pudo verificar el documento.',
      });
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!documentDataUri) {
       toast({
        variant: 'destructive',
        title: 'Falta Documento',
        description: 'Por favor, sube un documento para generar la descripción.',
      });
      return;
    }

    setIsGeneratingDesc(true);
    try {
      const result = await generateSupplierDescription({ documentDataUris: [documentDataUri] });
      form.setValue('description', result.description);
       toast({
        title: 'Descripción Generada',
        description: 'La descripción del proveedor ha sido generada por IA.',
      });
    } catch(error) {
        console.error('Description generation failed:', error);
        toast({
            variant: 'destructive',
            title: 'Error de Generación',
            description: 'No se pudo generar la descripción.',
        });
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: 'Proveedor Guardado',
      description: `El proveedor ${values.name} ha sido guardado exitosamente.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Datos Fiscales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Proveedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Aceros del Norte" {...field} />
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
                        <Input placeholder="Av. Siempre Viva 123" {...field} />
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
                      <FormLabel>Nombre del Contacto</FormLabel>
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
                      <FormLabel>CLABE</FormLabel>
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Categoría y Documentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <FormField
                  control={form.control}
                  name="supplierType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Proveedor</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="supplies">Suministros</SelectItem>
                          <SelectItem value="services">Servicios</SelectItem>
                          <SelectItem value="leasing">Arrendamiento</SelectItem>
                          <SelectItem value="transport">Transporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Documento de Cumplimiento</FormLabel>
                  <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Arrastra o{' '}
                      <Button type="button" variant="link" className="text-primary p-0 h-auto">
                        haz clic para subir
                      </Button>
                    </p>
                    <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="application/pdf" />
                  </div>
                </div>

                {document && (
                    <div className="p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-3">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium truncate flex-1">{document.name}</span>
                            <button type="button" onClick={() => { setDocument(null); setComplianceResult(null); }} className="text-muted-foreground hover:text-foreground">
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-3">
                            {isCheckingCompliance ? (
                                 <div className="flex items-center text-sm text-muted-foreground animate-pulse">
                                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                    Verificando cumplimiento...
                                 </div>
                            ) : complianceResult ? (
                                <div>
                                    {complianceResult.isCompliant ? (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Cumple
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            No Cumple
                                        </Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">{complianceResult.complianceReport}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
                 <div className="p-3 border rounded-md bg-muted/50 space-y-1">
                    <h4 className="font-semibold text-sm">Requisitos</h4>
                    <p className="text-xs text-muted-foreground">{documentRequirements}</p>
                </div>
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Descripción</CardTitle>
                    <Button type="button" variant="link" size="sm" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !document}>
                      {isGeneratingDesc ? <Loader2 className="animate-spin mr-2" /> : null}
                      Generar con IA
                    </Button>
                  </div>
                   <CardDescription>Esta descripción es generada por IA basada en los documentos.</CardDescription>
              </CardHeader>
              <CardContent>
                 <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del proveedor..."
                          className="resize-none h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">Cancelar</Button>
          <Button type="submit">Guardar Proveedor</Button>
        </div>
      </form>
    </Form>
  );
}
