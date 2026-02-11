'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Eye, Upload, Camera, FileCheck, FileClock, FileX, AlertCircle, Loader2, Download, ArrowLeft, Mail, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/upload/file-upload';
import { uploadDocumentoProveedor } from '@/app/actions/archivos';
import { getDocumentosByProveedor } from '@/app/actions/proveedores';
import { toast } from 'sonner';

const InfoField = ({
  label,
  value,
  editValue,
  isEditing,
  onChange,
}: {
  label: string;
  value?: string;
  editValue?: string;
  isEditing: boolean;
  onChange?: (value: string) => void;
}) => {
  // Usar editValue cuando está en modo edición, sino usar value
  const displayValue = isEditing ? (editValue ?? value ?? '') : (value ?? '');

  return (
    <div className="grid grid-cols-3 gap-2 text-sm items-center">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2">
        <Input
          id={label.toLowerCase()}
          value={displayValue}
          className="bg-background/40 border-border/60 h-8"
          disabled={!isEditing}
          readOnly={!isEditing}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </dd>
    </div>
  );
};

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado';

type TipoDocumento =
  | 'acta_constitutiva'
  | 'comprobante_domicilio'
  | 'identificacion_representante'
  | 'constancia_fiscal'
  | 'caratula_bancaria'
  | 'poder_notarial'
  | 'opinion_cumplimiento'
  | 'foto_domicilio'
  | 'referencias_comerciales'
  | 'codigo_etica'
  | 'repse'
  | 'titulo_propiedad'
  | 'pago_predial'
  | 'poliza_seguro';

interface DocumentoRequerido {
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string;
  required: boolean;
  vigencia?: string;
}

const documentosRequeridos: DocumentoRequerido[] = [
  {
    tipo: 'poder_notarial',
    nombre: 'Poder notarial del representante legal',
    descripcion: 'Documento notariado',
    required: true,
  },
  {
    tipo: 'constancia_fiscal',
    nombre: 'Constancia de Situación Fiscal',
    descripcion: 'Vigencia semestral',
    required: true,
    vigencia: '6 meses',
  },
  {
    tipo: 'opinion_cumplimiento',
    nombre: 'Opinión de cumplimiento positiva del SAT',
    descripcion: 'Vigencia mensual',
    required: true,
    vigencia: '1 mes',
  },
  {
    tipo: 'identificacion_representante',
    nombre: 'Identificación Oficial del Representante',
    descripcion: 'INE, pasaporte o cédula',
    required: true,
  },
  {
    tipo: 'acta_constitutiva',
    nombre: 'Acta constitutiva y sus modificaciones',
    descripcion: 'Documento legal de la empresa',
    required: true,
  },
  {
    tipo: 'comprobante_domicilio',
    nombre: 'Comprobante de domicilio fiscal',
    descripcion: 'No mayor a 3 meses',
    required: true,
    vigencia: '3 meses',
  },
  {
    tipo: 'caratula_bancaria',
    nombre: 'Carátula del estado de cuenta bancaria',
    descripcion: 'Estado de cuenta o formato del banco',
    required: true,
  },
  {
    tipo: 'foto_domicilio',
    nombre: 'Fotografía del exterior del domicilio',
    descripcion: 'Foto a color del domicilio fiscal/comercial',
    required: true,
  },
  {
    tipo: 'referencias_comerciales',
    nombre: 'Referencias comerciales',
    descripcion: 'Mínimo 2 referencias',
    required: true,
  },
  {
    tipo: 'codigo_etica',
    nombre: 'Carta de aceptación al código de ética',
    descripcion: 'Documento firmado',
    required: true,
  },
];

const docStatusConfig = {
  aprobado: {
    icon: <FileCheck className="h-5 w-5 text-green-500" />,
    label: 'Aprobado',
    className: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800',
  },
  pendiente: {
    icon: <FileClock className="h-5 w-5 text-yellow-500" />,
    label: 'Pendiente',
    className: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  rechazado: {
    icon: <FileX className="h-5 w-5 text-red-500" />,
    label: 'Rechazado',
    className: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 bg-red-100 text-red-800',
  },
};

export default function PerfilProveedorPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Verificar si es vista de admin
  const [isAdminView, setIsAdminView] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id');
    const esVistaAdmin = !!idFromQuery;

    console.log('🔍 URL params:', { idFromQuery, esVistaAdmin });
    setIsAdminView(esVistaAdmin);

    // Si es vista de admin, cargar datos inmediatamente
    if (idFromQuery) {
      setProveedorId(idFromQuery);
      cargarInfoProveedor(idFromQuery);
      cargarDocumentos(idFromQuery, true); // Forzar vista admin
    }
  }, []);

  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatar?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para datos del proveedor
  const [proveedorInfo, setProveedorInfo] = useState<any>(null);
  const [editedInfo, setEditedInfo] = useState<any>(null); // Datos editados temporalmente
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Estados para documentos
  const [documentos, setDocumentos] = useState<any[]>([]); // Documentos con archivo
  const [documentosERP, setDocumentosERP] = useState<any[]>([]); // Todos los documentos del ERP
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocTipo, setSelectedDocTipo] = useState<TipoDocumento | null>(null);
  const [selectedDocIdr, setSelectedDocIdr] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Estado para visualizar documento
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [documentoParaVer, setDocumentoParaVer] = useState<any>(null);
  const [loadingDocumento, setLoadingDocumento] = useState(false);

  // Estados para acciones de administrador
  const [adminActionDialog, setAdminActionDialog] = useState<'aprobar' | 'rechazar' | 'solicitar_actualizacion' | 'solicitar_documento' | null>(null);
  const [selectedDocForAction, setSelectedDocForAction] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Obtener ID del proveedor desde query params o usar el usuario logueado
  const [proveedorId, setProveedorId] = useState<string>('');

  useEffect(() => {
    // Solo para vista normal (no admin)
    // Si el usuario es admin y no hay ID en la URL, no intentamos cargar info de proveedor
    const isUserAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super-admin';

    if (!isAdminView && session?.user?.id && !isUserAdmin) {
      const finalId = session.user.id;
      setProveedorId(finalId);
      cargarInfoProveedor(finalId);
      cargarDocumentos(finalId, false); // Vista de proveedor normal
    } else if (!isAdminView && isUserAdmin) {
      // Si es admin sin ID, no cargamos datos de proveedor y quitamos el loading
      setLoadingInfo(false);
      setLoading(false);
    }
  }, [session, isAdminView]);

  // Determinar permisos de edición y visualización basados en el rol
  const userRole = session?.user?.role;
  const isSuperAdmin = userRole === 'super-admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isProveedor = userRole === 'proveedor';

  // Lógica de permisos solicitada:
  // 1. Solo se puede modificar hasta Datos Bancarios (Admin/SuperAdmin). Los demás solo lectura.
  // 2. Si el usuario es proveedor, solo ve y modifica hasta Datos de Contacto.

  const canEditSection = (section: 'fiscal' | 'direccion' | 'contacto' | 'bancario' | 'comercial' | 'operativo' | 'contable' | 'estado') => {
    if (!isEditing) return false;

    // Proveedor solo edita hasta contacto
    if (isProveedor) {
      return ['fiscal', 'direccion', 'contacto'].includes(section);
    }

    // Admin edita hasta bancario
    if (isAdmin) {
      return ['fiscal', 'direccion', 'contacto', 'bancario'].includes(section);
    }

    return false;
  };

  const canViewSection = (section: 'fiscal' | 'direccion' | 'contacto' | 'bancario' | 'comercial' | 'operativo' | 'contable' | 'estado') => {
    // Proveedor solo ve hasta contacto
    if (isProveedor) {
      return ['fiscal', 'direccion', 'contacto'].includes(section);
    }

    // Admin ve todo
    return true;
  };

  const cargarInfoProveedor = async (id: string) => {
    if (!id) return;

    setLoadingInfo(true);
    try {
      // Si hay un parámetro 'id' en la URL, es vista de admin
      const isAdminView = new URLSearchParams(window.location.search).get('id');
      const endpoint = isAdminView ? `/api/admin/proveedores/${id}` : '/api/proveedor/info';

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success || result.erpDatos) {
        // Mapear datos desde el endpoint de admin
        const data = result.erpDatos ? {
          // Datos fiscales
          razonSocial: result.erpDatos.Nombre,
          nombreCorto: result.erpDatos.NombreCorto,
          rfc: result.erpDatos.RFC,
          curp: result.erpDatos.CURP,
          codigo: result.erpDatos.Proveedor,

          // Dirección completa
          direccionFiscal: result.erpDatos.Direccion,
          direccionNumero: result.erpDatos.DireccionNumero,
          direccionNumeroInt: result.erpDatos.DireccionNumeroInt,
          entreCalles: result.erpDatos.EntreCalles,
          colonia: result.erpDatos.Colonia,
          poblacion: result.erpDatos.Poblacion,
          estado: result.erpDatos.Estado,
          pais: result.erpDatos.Pais,
          codigoPostal: result.erpDatos.CodigoPostal,

          // Datos de contacto
          nombreContacto: result.erpDatos.Contacto1,
          contacto2: result.erpDatos.Contacto2,
          email: result.erpDatos.eMail1 || result.portalEmail,
          email2: result.erpDatos.eMail2,
          telefono: result.erpDatos.Telefonos || result.portalTelefono,
          fax: result.erpDatos.Fax,
          extension1: result.erpDatos.Extencion1,
          extension2: result.erpDatos.Extencion2,

          // Datos bancarios
          numeroCuenta: result.erpDatos.ProvCuenta,
          banco: result.erpDatos.ProvBancoSucursal,
          beneficiario: result.erpDatos.Beneficiario,
          beneficiarioNombre: result.erpDatos.BeneficiarioNombre,
          leyendaCheque: result.erpDatos.LeyendaCheque,

          // Condiciones comerciales
          condicionPago: result.erpDatos.Condicion,
          formaPago: result.erpDatos.FormaPago,
          categoria: result.erpDatos.Categoria,
          familia: result.erpDatos.Familia,
          descuento: result.erpDatos.Descuento,
          moneda: result.erpDatos.DefMoneda,
          comision: result.erpDatos.Comision,

          // Información operativa
          diasRevision: [result.erpDatos.DiaRevision1, result.erpDatos.DiaRevision2].filter(Boolean).join(', '),
          diasPago: [result.erpDatos.DiaPago1, result.erpDatos.DiaPago2].filter(Boolean).join(', '),
          comprador: result.erpDatos.Comprador,
          agente: result.erpDatos.Agente,
          centroCostos: result.erpDatos.CentroCostos,

          // Información contable
          cuentaContable: result.erpDatos.Cuenta,
          cuentaRetencion: result.erpDatos.CuentaRetencion,
          fiscalRegimen: result.erpDatos.FiscalRegimen,
          importe1: result.erpDatos.Importe1,
          importe2: result.erpDatos.Importe2,

          // Estado y fechas
          estatus: result.erpDatos.Estatus,
          situacion: result.erpDatos.Situacion,
          situacionFecha: result.erpDatos.SituacionFecha,
          situacionNota: result.erpDatos.SituacionNota,
          situacionUsuario: result.erpDatos.SituacionUsuario,
          alta: result.erpDatos.Alta,
          ultimoCambio: result.erpDatos.UltimoCambio,
          tieneMovimientos: result.erpDatos.TieneMovimientos,
          tipo: result.erpDatos.Tipo,

          // Contexto
          codigoProveedorERP: result.erpDatos.Proveedor,
          portalEstatus: result.portalEstatus,
          portalFechaRegistro: result.portalFechaRegistro
        } : result.data;

        console.log('✅ Información del proveedor cargada:', data);
        setProveedorInfo(data);
      } else {
        console.error('❌ Error cargando información:', result.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const cargarDocumentos = async (id: string, forceAdminView?: boolean) => {
    if (!id) return;

    setLoading(true);
    try {
      console.log("🔍 Cargando documentos desde ERP...");

      // Determinar si es vista de admin: usar el parámetro forzado o verificar la URL directamente
      const urlParams = new URLSearchParams(window.location.search);
      const idFromQuery = urlParams.get('id');
      const esVistaAdmin = forceAdminView !== undefined ? forceAdminView : !!idFromQuery;

      console.log("🔍 esVistaAdmin:", esVistaAdmin, "ID:", id, "idFromQuery:", idFromQuery);

      // Determinar endpoint según si es vista de admin
      const endpoint = esVistaAdmin
        ? `/api/admin/proveedores/${id}/documentos`
        : '/api/proveedor/documentos';

      console.log("🔍 Usando endpoint:", endpoint);
      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        console.log("✅ Documentos del ERP cargados:", result.data);

        // Guardar TODOS los documentos del ERP
        setDocumentosERP(result.data.documentos || []);

        // Guardar estadísticas
        setEstadisticas(result.data.estadisticas || null);

        // Transformar solo los documentos con archivo para la lista de documentos subidos
        const documentosConArchivo = result.data.documentos
          .filter((doc: any) => doc.tieneArchivo)
          .map((doc: any) => ({
            id: doc.idr?.toString() || '',
            proveedorId: proveedorId,
            tipoDocumento: doc.documentoRequerido.toLowerCase().replace(/\s+/g, '_'),
            fileName: doc.nombreArchivo || doc.documentoRequerido,
            fileUrl: doc.rutaArchivo || '',
            uploadedAt: doc.fechaAlta || new Date().toISOString(),
            status: doc.autorizado ? 'aprobado' : (doc.rechazado ? 'rechazado' : 'pendiente'),
            reviewedBy: doc.usuario || null,
            reviewedAt: doc.fechaUltimoCambio || null,
            observaciones: doc.observaciones || null,
          }));

        setDocumentos(documentosConArchivo);
        console.log("📦 Documentos ERP:", result.data.documentos);
        console.log("📦 Estadísticas:", result.data.estadisticas);
      } else {
        console.error("❌ Error cargando documentos:", result.error);
      }
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editedInfo || !proveedorId) return;

    setLoadingInfo(true);

    // Toast de inicio
    const loadingToast = toast.loading('Guardando cambios en el ERP...', {
      description: 'Por favor espera mientras actualizamos la información'
    });

    try {
      // 1. Mapear datos del frontend al formato que espera el SP de Intelisis
      const dataToSave = {
        nombre: editedInfo.razonSocial,
        nombreCorto: editedInfo.nombreCorto,
        rfc: editedInfo.rfc,
        curp: editedInfo.curp,
        regimen: editedInfo.fiscalRegimen,
        direccion: editedInfo.direccionFiscal,
        numeroExterior: editedInfo.direccionNumero,
        numeroInterior: editedInfo.direccionNumeroInt,
        entreCalles: editedInfo.entreCalles,
        colonia: editedInfo.colonia,
        ciudad: editedInfo.poblacion,
        estado: editedInfo.estado,
        pais: editedInfo.pais,
        codigoPostal: editedInfo.codigoPostal,
        contactoPrincipal: editedInfo.nombreContacto,
        contactoSecundario: editedInfo.contacto2,
        email1: editedInfo.email,
        email2: editedInfo.email2,
        telefonos: editedInfo.telefono,
        fax: editedInfo.fax,
        extension1: editedInfo.extension1,
        extension2: editedInfo.extension2,
        banco: editedInfo.banco,
        cuentaBancaria: editedInfo.numeroCuenta,
        beneficiario: typeof editedInfo.beneficiario === 'string' ? parseInt(editedInfo.beneficiario) : editedInfo.beneficiario,
        nombreBeneficiario: editedInfo.beneficiarioNombre,
        leyendaCheque: editedInfo.leyendaCheque,
        categoria: editedInfo.categoria,
        condicionPago: editedInfo.condicionPago,
        formaPago: editedInfo.formaPago,
        descuento: typeof editedInfo.descuento === 'string' ? parseFloat(editedInfo.descuento) : editedInfo.descuento,
      };

      console.log('📤 [handleSave] Datos a enviar:', dataToSave);

      // 2. Determinar endpoint según el rol/vista
      const urlParams = new URLSearchParams(window.location.search);
      const idFromQuery = urlParams.get('id');
      const empresaParaAPI = session?.user?.empresaActual || 'la-cantera';

      const endpoint = idFromQuery
        ? `/api/admin/proveedores/${proveedorId}?empresa=${empresaParaAPI}`
        : '/api/proveedor/info';

      console.log('📍 [handleSave] Endpoint:', endpoint);

      // 3. Realizar la petición de guardado
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      const result = await response.json();
      console.log('📥 [handleSave] Respuesta del servidor:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Error al guardar los cambios en el ERP');
      }

      // 4. VALIDACIÓN POST-GUARDADO: Re-consultar datos para confirmar persistencia
      toast.loading('Validando cambios guardados...', {
        id: loadingToast,
        description: 'Verificando que los datos se guardaron correctamente'
      });

      console.log('🔄 [handleSave] Re-consultando datos para validar...');

      // Esperar un momento para que el ERP procese
      await new Promise(resolve => setTimeout(resolve, 1000));

      const validateEndpoint = idFromQuery
        ? `/api/admin/proveedores/${proveedorId}?empresa=${empresaParaAPI}`
        : '/api/proveedor/info';

      const validateResponse = await fetch(validateEndpoint);
      const validateResult = await validateResponse.json();

      console.log('📥 [handleSave] Datos re-consultados:', validateResult);

      if (!validateResponse.ok || !validateResult.success) {
        console.warn('⚠️ [handleSave] No se pudo validar, pero el guardado fue exitoso');
        // No lanzar error, solo advertir
      }

      // 5. Actualizar estado local con los datos confirmados del servidor
      if (validateResult.erpDatos || validateResult.data) {
        const confirmedData = validateResult.erpDatos ? {
          // Mapear igual que en cargarInfoProveedor
          razonSocial: validateResult.erpDatos.Nombre,
          nombreCorto: validateResult.erpDatos.NombreCorto,
          rfc: validateResult.erpDatos.RFC,
          curp: validateResult.erpDatos.CURP,
          codigo: validateResult.erpDatos.Proveedor,
          direccionFiscal: validateResult.erpDatos.Direccion,
          direccionNumero: validateResult.erpDatos.DireccionNumero,
          direccionNumeroInt: validateResult.erpDatos.DireccionNumeroInt,
          entreCalles: validateResult.erpDatos.EntreCalles,
          colonia: validateResult.erpDatos.Colonia,
          poblacion: validateResult.erpDatos.Poblacion,
          estado: validateResult.erpDatos.Estado,
          pais: validateResult.erpDatos.Pais,
          codigoPostal: validateResult.erpDatos.CodigoPostal,
          nombreContacto: validateResult.erpDatos.Contacto1,
          contacto2: validateResult.erpDatos.Contacto2,
          email: validateResult.erpDatos.eMail1 || validateResult.portalEmail,
          email2: validateResult.erpDatos.eMail2,
          telefono: validateResult.erpDatos.Telefonos || validateResult.portalTelefono,
          fax: validateResult.erpDatos.Fax,
          extension1: validateResult.erpDatos.Extencion1,
          extension2: validateResult.erpDatos.Extencion2,
          numeroCuenta: validateResult.erpDatos.ProvCuenta,
          banco: validateResult.erpDatos.ProvBancoSucursal,
          beneficiario: validateResult.erpDatos.Beneficiario,
          beneficiarioNombre: validateResult.erpDatos.BeneficiarioNombre,
          leyendaCheque: validateResult.erpDatos.LeyendaCheque,
          condicionPago: validateResult.erpDatos.Condicion,
          formaPago: validateResult.erpDatos.FormaPago,
          categoria: validateResult.erpDatos.Categoria,
          familia: validateResult.erpDatos.Familia,
          descuento: validateResult.erpDatos.Descuento,
          moneda: validateResult.erpDatos.DefMoneda,
          comision: validateResult.erpDatos.Comision,
          diasRevision: [validateResult.erpDatos.DiaRevision1, validateResult.erpDatos.DiaRevision2].filter(Boolean).join(', '),
          diasPago: [validateResult.erpDatos.DiaPago1, validateResult.erpDatos.DiaPago2].filter(Boolean).join(', '),
          comprador: validateResult.erpDatos.Comprador,
          agente: validateResult.erpDatos.Agente,
          centroCostos: validateResult.erpDatos.CentroCostos,
          cuentaContable: validateResult.erpDatos.Cuenta,
          cuentaRetencion: validateResult.erpDatos.CuentaRetencion,
          fiscalRegimen: validateResult.erpDatos.FiscalRegimen,
          importe1: validateResult.erpDatos.Importe1,
          importe2: validateResult.erpDatos.Importe2,
          estatus: validateResult.erpDatos.Estatus,
          situacion: validateResult.erpDatos.Situacion,
          situacionFecha: validateResult.erpDatos.SituacionFecha,
          situacionNota: validateResult.erpDatos.SituacionNota,
          situacionUsuario: validateResult.erpDatos.SituacionUsuario,
          alta: validateResult.erpDatos.Alta,
          ultimoCambio: validateResult.erpDatos.UltimoCambio,
          tieneMovimientos: validateResult.erpDatos.TieneMovimientos,
          tipo: validateResult.erpDatos.Tipo,
          codigoProveedorERP: validateResult.erpDatos.Proveedor,
          portalEstatus: validateResult.portalEstatus,
          portalFechaRegistro: validateResult.portalFechaRegistro
        } : validateResult.data;

        console.log('✅ [handleSave] Datos confirmados del servidor:', confirmedData);
        setProveedorInfo(confirmedData);
      } else {
        // Si no hay datos de validación, usar los editados
        setProveedorInfo(editedInfo);
      }

      // 6. Salir del modo edición
      setIsEditing(false);
      setEditedInfo(null);

      // 7. Toast de éxito
      toast.success('¡Cambios guardados exitosamente!', {
        id: loadingToast,
        description: 'La información se ha actualizado correctamente en el ERP',
        icon: <CheckCircle2 className="h-5 w-5" />,
        duration: 4000,
      });

      console.log('✅ [handleSave] Guardado completado exitosamente');

    } catch (error: any) {
      console.error('❌ [handleSave] Error:', error);

      toast.error('Error al guardar los cambios', {
        id: loadingToast,
        description: error.message || 'No se pudieron guardar los cambios. Por favor intenta nuevamente.',
        icon: <XCircle className="h-5 w-5" />,
        duration: 6000,
      });
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleEdit = () => {
    // Copiar los datos actuales para edición
    setEditedInfo({ ...proveedorInfo });
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Descartar cambios
    setEditedInfo(null);
    setIsEditing(false);
  };

  // Función para actualizar un campo específico
  const updateField = (field: string, value: string) => {
    setEditedInfo((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openUploadDialog = (tipo: TipoDocumento, idr?: number) => {
    setSelectedDocTipo(tipo);
    setSelectedDocIdr(idr || null);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !selectedDocTipo) return;

    setUploading(true);

    try {
      const base64 = await fileToBase64(selectedFile);

      // Si es vista de admin, usar el endpoint de admin que guarda en el ERP
      if (isAdminView) {
        const response = await fetch(`/api/admin/proveedores/${proveedorId}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoDocumento: selectedDocTipo,
            file: base64,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            replaceIdr: selectedDocIdr || undefined,
          })
        });

        const result = await response.json();

        if (result.success) {
          await cargarDocumentos(proveedorId, true);
          setUploadDialogOpen(false);
          setSelectedFile(null);
          setSelectedDocTipo(null);
        } else {
          alert(result.error || 'Error al subir el documento');
        }
      } else {
        // Vista de proveedor: usar endpoint API de documentos
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('tipoDocumento', selectedDocTipo);
        if (selectedDocIdr) formData.append('replaceIdr', selectedDocIdr.toString());

        const response = await fetch('/api/proveedor/documentos/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          await cargarDocumentos(proveedorId);
          setUploadDialogOpen(false);
          setSelectedFile(null);
          setSelectedDocTipo(null);
        } else {
          alert(result.error || 'Error al subir el documento');
        }
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Función para manejar acciones de administrador
  const handleAdminAction = (docERP: any, action: 'aprobar' | 'rechazar' | 'solicitar_actualizacion' | 'solicitar_documento') => {
    setSelectedDocForAction(docERP);
    setAdminActionDialog(action);
    setActionReason('');
  };

  const executeAdminAction = async () => {
    if (!selectedDocForAction || !adminActionDialog) return;

    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/proveedores/${proveedorId}/documentos/${selectedDocForAction.idr}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: adminActionDialog,
          motivo: actionReason.trim() || undefined
        })
      });

      if (response.ok) {
        await cargarDocumentos(proveedorId, isAdminView); // Recargar documentos
        setAdminActionDialog(null);
        setSelectedDocForAction(null);
        setActionReason('');
      } else {
        const result = await response.json();
        alert(result.error || 'Error al procesar la acción');
      }
    } catch (error) {
      console.error('Error en acción de administrador:', error);
      alert('Error al procesar la acción');
    } finally {
      setProcessingAction(false);
    }
  };

  // Función para visualizar documento
  const handleVerDocumento = async (docERP: any) => {
    if (!docERP.idr) {
      alert('No se encontró el ID del documento');
      return;
    }

    setDocumentoParaVer(docERP);
    setViewDialogOpen(true);
    setLoadingDocumento(true);

    try {
      // Obtener el archivo del servidor
      const urlParams = new URLSearchParams(window.location.search);
      const idFromQuery = urlParams.get('id');
      const esVistaAdmin = !!idFromQuery;

      const endpoint = esVistaAdmin
        ? `/api/admin/proveedores/${idFromQuery}/documentos/${docERP.idr}/archivo`
        : `/api/proveedor/documentos/${docERP.idr}/archivo`;

      console.log('[handleVerDocumento] Llamando endpoint:', endpoint);
      console.log('[handleVerDocumento] docERP:', docERP);

      const response = await fetch(endpoint);
      const result = await response.json();

      console.log('[handleVerDocumento] Respuesta status:', response.status);
      console.log('[handleVerDocumento] Respuesta:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Error al obtener el documento');
      }

      if (result.data?.isBlob && result.data?.downloadUrl) {
        // Archivo en Azure Blob — abrir URL SAS directamente
        window.open(result.data.downloadUrl, '_blank');
        setViewDialogOpen(false);
      } else if (result.data?.contenido) {
        setDocumentoParaVer({
          ...docERP,
          contenidoBase64: result.data.contenido,
          tipoMime: result.data.tipoMime || 'application/pdf',
        });
      } else {
        throw new Error('No se pudo cargar el contenido del documento');
      }
    } catch (error: any) {
      console.error('[handleVerDocumento] Error:', error);
      alert(`Error al cargar el documento: ${error.message}`);
      setViewDialogOpen(false);
    } finally {
      setLoadingDocumento(false);
    }
  };

  // Función para descargar documento
  const handleDescargarDocumento = async (docERP: any) => {
    if (!docERP.idr) {
      alert('No se encontró el ID del documento');
      return;
    }

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const idFromQuery = urlParams.get('id');
      const esVistaAdmin = !!idFromQuery;

      const endpoint = esVistaAdmin
        ? `/api/admin/proveedores/${idFromQuery}/documentos/${docERP.idr}/archivo`
        : `/api/proveedor/documentos/${docERP.idr}/archivo`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Error al obtener el documento');
      }

      const result = await response.json();

      if (result.success && result.data?.isBlob && result.data?.downloadUrl) {
        // Archivo en Azure Blob — descargar via URL SAS
        const a = document.createElement('a');
        a.href = result.data.downloadUrl;
        a.download = docERP.nombreArchivo || result.data.nombreArchivo || `${docERP.documentoRequerido}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (result.success && result.data?.contenido) {
        // Archivo local — descargar desde base64
        const byteCharacters = atob(result.data.contenido);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.data.tipoMime || 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docERP.nombreArchivo || `${docERP.documentoRequerido}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error(result.error || 'No se pudo descargar el documento');
      }
    } catch (error: any) {
      console.error('Error descargando documento:', error);
      alert(`Error al descargar el documento: ${error.message}`);
    }
  };

  const totalDocumentos = documentosERP.length || 14; // Usar documentos del ERP o default
  const documentosAprobados = estadisticas?.documentosAutorizados || 0;
  const documentosConArchivo = estadisticas?.documentosConArchivo || 0;
  const porcentajeCompletado = Math.round((documentosConArchivo / totalDocumentos) * 100);

  // Obtener iniciales para el avatar
  const getInitials = () => {
    if (proveedorInfo?.razonSocial) {
      const words = proveedorInfo.razonSocial.split(' ');
      return words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }
    return session?.user?.name?.slice(0, 2).toUpperCase() || 'PR';
  };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Perfil del Proveedor</h1>
      </div>
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Información General</CardTitle>
                <CardDescription>
                  Información del proveedor obtenida del ERP de la empresa seleccionada.
                </CardDescription>
              </div>
              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                  </>
                ) : (
                  <Button onClick={handleEdit}>Editar</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {loadingInfo ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Cargando información del proveedor...</span>
                </div>
              ) : !proveedorInfo ? (
                <div className="flex items-center justify-center p-8">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mr-2" />
                  <span>No se pudo cargar la información del proveedor</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <div
                      className={cn("relative group", isEditing && "cursor-pointer")}
                      onClick={() => isEditing && fileInputRef.current?.click()}
                    >
                      <Avatar className="h-24 w-24">
                        {avatarPreview ? (
                          <Image
                            src={avatarPreview}
                            alt="User avatar"
                            width={96}
                            height={96}
                            className="rounded-full object-cover"
                          />
                        ) : <AvatarFallback>{getInitials()}</AvatarFallback>}
                      </Avatar>
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-8 w-8 text-white" />
                        </div>
                      )}
                      <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="flex-1 space-y-4">
                      <h3 className="text-lg font-semibold">Datos Fiscales</h3>
                      <InfoField label="Razón Social" value={proveedorInfo.razonSocial} editValue={editedInfo?.razonSocial} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('razonSocial', v)} />
                      <InfoField label="Nombre Corto" value={proveedorInfo.nombreCorto} editValue={editedInfo?.nombreCorto} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('nombreCorto', v)} />
                      <InfoField label="RFC" value={proveedorInfo.rfc} editValue={editedInfo?.rfc} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('rfc', v)} />
                      <InfoField label="CURP" value={proveedorInfo.curp} editValue={editedInfo?.curp} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('curp', v)} />
                      <InfoField label="Código Proveedor" value={proveedorInfo.codigo} editValue={editedInfo?.codigo} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('codigo', v)} />
                      <InfoField label="Régimen Fiscal" value={proveedorInfo.fiscalRegimen} editValue={editedInfo?.fiscalRegimen} isEditing={canEditSection('fiscal')} onChange={(v) => updateField('fiscalRegimen', v)} />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Dirección Completa</h3>
                    <div className="space-y-4">
                      <InfoField label="Dirección" value={proveedorInfo.direccionFiscal} editValue={editedInfo?.direccionFiscal} isEditing={canEditSection('direccion')} onChange={(v) => updateField('direccionFiscal', v)} />
                      <InfoField label="Número Exterior" value={proveedorInfo.direccionNumero} editValue={editedInfo?.direccionNumero} isEditing={canEditSection('direccion')} onChange={(v) => updateField('direccionNumero', v)} />
                      <InfoField label="Número Interior" value={proveedorInfo.direccionNumeroInt} editValue={editedInfo?.direccionNumeroInt} isEditing={canEditSection('direccion')} onChange={(v) => updateField('direccionNumeroInt', v)} />
                      <InfoField label="Entre Calles" value={proveedorInfo.entreCalles} editValue={editedInfo?.entreCalles} isEditing={canEditSection('direccion')} onChange={(v) => updateField('entreCalles', v)} />
                      <InfoField label="Colonia" value={proveedorInfo.colonia} editValue={editedInfo?.colonia} isEditing={canEditSection('direccion')} onChange={(v) => updateField('colonia', v)} />
                      <InfoField label="Ciudad/Población" value={proveedorInfo.poblacion} editValue={editedInfo?.poblacion} isEditing={canEditSection('direccion')} onChange={(v) => updateField('poblacion', v)} />
                      <InfoField label="Estado" value={proveedorInfo.estado} editValue={editedInfo?.estado} isEditing={canEditSection('direccion')} onChange={(v) => updateField('estado', v)} />
                      <InfoField label="País" value={proveedorInfo.pais} editValue={editedInfo?.pais} isEditing={canEditSection('direccion')} onChange={(v) => updateField('pais', v)} />
                      <InfoField label="Código Postal" value={proveedorInfo.codigoPostal} editValue={editedInfo?.codigoPostal} isEditing={canEditSection('direccion')} onChange={(v) => updateField('codigoPostal', v)} />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                    <div className="space-y-4">
                      <InfoField label="Contacto Principal" value={proveedorInfo.nombreContacto} editValue={editedInfo?.nombreContacto} isEditing={canEditSection('contacto')} onChange={(v) => updateField('nombreContacto', v)} />
                      <InfoField label="Contacto Secundario" value={proveedorInfo.contacto2} editValue={editedInfo?.contacto2} isEditing={canEditSection('contacto')} onChange={(v) => updateField('contacto2', v)} />
                      <InfoField label="Email Principal" value={proveedorInfo.email} editValue={editedInfo?.email} isEditing={canEditSection('contacto')} onChange={(v) => updateField('email', v)} />
                      <InfoField label="Email Secundario" value={proveedorInfo.email2} editValue={editedInfo?.email2} isEditing={canEditSection('contacto')} onChange={(v) => updateField('email2', v)} />
                      <InfoField label="Teléfono" value={proveedorInfo.telefono} editValue={editedInfo?.telefono} isEditing={canEditSection('contacto')} onChange={(v) => updateField('telefono', v)} />
                      <InfoField label="Fax" value={proveedorInfo.fax} editValue={editedInfo?.fax} isEditing={canEditSection('contacto')} onChange={(v) => updateField('fax', v)} />
                      <InfoField label="Extensión 1" value={proveedorInfo.extension1} editValue={editedInfo?.extension1} isEditing={canEditSection('contacto')} onChange={(v) => updateField('extension1', v)} />
                      <InfoField label="Extensión 2" value={proveedorInfo.extension2} editValue={editedInfo?.extension2} isEditing={canEditSection('contacto')} onChange={(v) => updateField('extension2', v)} />
                    </div>
                  </div>

                  {canViewSection('bancario') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
                        <div className="space-y-4">
                          <InfoField label="Banco/Sucursal" value={proveedorInfo.banco} editValue={editedInfo?.banco} isEditing={canEditSection('bancario')} onChange={(v) => updateField('banco', v)} />
                          <InfoField label="Número de Cuenta" value={proveedorInfo.numeroCuenta} editValue={editedInfo?.numeroCuenta} isEditing={canEditSection('bancario')} onChange={(v) => updateField('numeroCuenta', v)} />
                          <InfoField label="Beneficiario" value={proveedorInfo.beneficiario} editValue={editedInfo?.beneficiario} isEditing={canEditSection('bancario')} onChange={(v) => updateField('beneficiario', v)} />
                          <InfoField label="Nombre del Beneficiario" value={proveedorInfo.beneficiarioNombre} editValue={editedInfo?.beneficiarioNombre} isEditing={canEditSection('bancario')} onChange={(v) => updateField('beneficiarioNombre', v)} />
                          <InfoField label="Leyenda del Cheque" value={proveedorInfo.leyendaCheque} editValue={editedInfo?.leyendaCheque} isEditing={canEditSection('bancario')} onChange={(v) => updateField('leyendaCheque', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('comercial') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Condiciones Comerciales</h3>
                        <div className="space-y-4">
                          <InfoField label="Condición de Pago" value={proveedorInfo.condicionPago} editValue={editedInfo?.condicionPago} isEditing={canEditSection('comercial')} onChange={(v) => updateField('condicionPago', v)} />
                          <InfoField label="Forma de Pago" value={proveedorInfo.formaPago} editValue={editedInfo?.formaPago} isEditing={canEditSection('comercial')} onChange={(v) => updateField('formaPago', v)} />
                          <InfoField label="Categoría" value={proveedorInfo.categoria} editValue={editedInfo?.categoria} isEditing={canEditSection('comercial')} onChange={(v) => updateField('categoria', v)} />
                          <InfoField label="Familia" value={proveedorInfo.familia} editValue={editedInfo?.familia} isEditing={canEditSection('comercial')} onChange={(v) => updateField('familia', v)} />
                          <InfoField label="Descuento" value={proveedorInfo.descuento?.toString()} editValue={editedInfo?.descuento?.toString()} isEditing={canEditSection('comercial')} onChange={(v) => updateField('descuento', v)} />
                          <InfoField label="Comisión" value={proveedorInfo.comision?.toString()} editValue={editedInfo?.comision?.toString()} isEditing={canEditSection('comercial')} onChange={(v) => updateField('comision', v)} />
                          <InfoField label="Moneda" value={proveedorInfo.moneda} editValue={editedInfo?.moneda} isEditing={canEditSection('comercial')} onChange={(v) => updateField('moneda', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('operativo') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Información Operativa</h3>
                        <div className="space-y-4">
                          <InfoField label="Días de Revisión" value={proveedorInfo.diasRevision} editValue={editedInfo?.diasRevision} isEditing={canEditSection('operativo')} onChange={(v) => updateField('diasRevision', v)} />
                          <InfoField label="Días de Pago" value={proveedorInfo.diasPago} editValue={editedInfo?.diasPago} isEditing={canEditSection('operativo')} onChange={(v) => updateField('diasPago', v)} />
                          <InfoField label="Comprador" value={proveedorInfo.comprador} editValue={editedInfo?.comprador} isEditing={canEditSection('operativo')} onChange={(v) => updateField('comprador', v)} />
                          <InfoField label="Agente" value={proveedorInfo.agente} editValue={editedInfo?.agente} isEditing={canEditSection('operativo')} onChange={(v) => updateField('agente', v)} />
                          <InfoField label="Centro de Costos" value={proveedorInfo.centroCostos} editValue={editedInfo?.centroCostos} isEditing={canEditSection('operativo')} onChange={(v) => updateField('centroCostos', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('contable') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Información Contable</h3>
                        <div className="space-y-4">
                          <InfoField label="Cuenta Contable" value={proveedorInfo.cuentaContable} editValue={editedInfo?.cuentaContable} isEditing={canEditSection('contable')} onChange={(v) => updateField('cuentaContable', v)} />
                          <InfoField label="Cuenta de Retención" value={proveedorInfo.cuentaRetencion} editValue={editedInfo?.cuentaRetencion} isEditing={canEditSection('contable')} onChange={(v) => updateField('cuentaRetencion', v)} />
                          <InfoField label="Importe 1" value={proveedorInfo.importe1?.toString()} editValue={editedInfo?.importe1?.toString()} isEditing={canEditSection('contable')} onChange={(v) => updateField('importe1', v)} />
                          <InfoField label="Importe 2" value={proveedorInfo.importe2?.toString()} editValue={editedInfo?.importe2?.toString()} isEditing={canEditSection('contable')} onChange={(v) => updateField('importe2', v)} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('estado') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Estado y Situación</h3>
                        <div className="space-y-4">
                          <InfoField label="Estatus" value={proveedorInfo.estatus} isEditing={false} />
                          <InfoField label="Situación" value={proveedorInfo.situacion} isEditing={false} />
                          <InfoField label="Fecha de Situación" value={proveedorInfo.situacionFecha ? new Date(proveedorInfo.situacionFecha).toLocaleDateString('es-MX') : ''} isEditing={false} />
                          <InfoField label="Nota de Situación" value={proveedorInfo.situacionNota} isEditing={false} />
                          <InfoField label="Usuario de Situación" value={proveedorInfo.situacionUsuario} isEditing={false} />
                          <InfoField label="Tiene Movimientos" value={proveedorInfo.tieneMovimientos ? 'Sí' : 'No'} isEditing={false} />
                          <InfoField label="Tipo" value={proveedorInfo.tipo} isEditing={false} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('estado') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Fechas Importantes</h3>
                        <div className="space-y-4">
                          <InfoField label="Fecha de Alta" value={proveedorInfo.alta ? new Date(proveedorInfo.alta).toLocaleDateString('es-MX') : ''} isEditing={false} />
                          <InfoField label="Último Cambio" value={proveedorInfo.ultimoCambio ? new Date(proveedorInfo.ultimoCambio).toLocaleDateString('es-MX') : ''} isEditing={false} />
                          <InfoField label="Registro en Portal" value={proveedorInfo.portalFechaRegistro ? new Date(proveedorInfo.portalFechaRegistro).toLocaleDateString('es-MX') : 'No registrado'} isEditing={false} />
                        </div>
                      </div>
                    </>
                  )}

                  {canViewSection('estado') && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Contexto del Sistema</h3>
                        <div className="space-y-4">
                          <InfoField label="Empresa Actual" value={session?.user?.empresaActual} isEditing={false} />
                          <InfoField label="Código en ERP" value={proveedorInfo.codigoProveedorERP} isEditing={false} />
                          <InfoField label="Estatus en Portal" value={proveedorInfo.portalEstatus} isEditing={false} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>
                    Gestione y valide los documentos requeridos para mantener su perfil activo.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{porcentajeCompletado}%</div>
                  <div className="text-xs text-muted-foreground">
                    {documentosConArchivo}/{totalDocumentos} con archivo
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {documentosAprobados} aprobados
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Actualización</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosERP.length > 0 ? (
                      documentosERP.map((docERP: any) => {
                        // Determinar el estado del documento
                        const status = docERP.autorizado ? 'aprobado' : (docERP.rechazado ? 'rechazado' : (docERP.tieneArchivo ? 'pendiente' : 'pendiente'));
                        const config = docStatusConfig[status as DocStatus];

                        return (
                          <TableRow key={docERP.orden}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{docERP.documentoRequerido}</div>
                                <div className="text-xs text-muted-foreground">
                                  {docERP.grupo}
                                  {docERP.requerido && ' • Requerido'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn('gap-1 font-normal', config.className)}
                              >
                                {config.icon}
                                {config.label}
                                {!docERP.tieneArchivo && ' - Sin archivo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {docERP.fechaAlta
                                ? new Date(docERP.fechaAlta).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!docERP.tieneArchivo ? (
                                  // Documentos sin archivo
                                  <>
                                    {!isAdminView && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openUploadDialog(docERP.documentoRequerido as TipoDocumento)}
                                      >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir
                                      </Button>
                                    )}

                                    {isAdminView && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openUploadDialog(docERP.documentoRequerido as TipoDocumento)}
                                        >
                                          <Upload className="mr-2 h-4 w-4" />
                                          Subir por Admin
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Solicitar documento al proveedor"
                                          onClick={() => handleAdminAction(docERP, 'solicitar_documento')}
                                          className="text-blue-600 hover:text-blue-700"
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  // Documentos con archivo
                                  <>
                                    {!isAdminView && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openUploadDialog(docERP.documentoRequerido as TipoDocumento, docERP.idr)}
                                      >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Reemplazar
                                      </Button>
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Ver documento"
                                      onClick={() => handleVerDocumento(docERP)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      title="Descargar archivo"
                                      onClick={() => handleDescargarDocumento(docERP)}
                                    >
                                      <Download className="h-4 w-4" />
                                      <span className="sr-only">Descargar</span>
                                    </Button>

                                    {isAdminView && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openUploadDialog(docERP.documentoRequerido as TipoDocumento, docERP.idr)}
                                        >
                                          <Upload className="mr-2 h-4 w-4" />
                                          Reemplazar
                                        </Button>

                                        {!docERP.autorizado && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            title="Aprobar documento"
                                            onClick={() => handleAdminAction(docERP, 'aprobar')}
                                            className="text-green-600 hover:text-green-700"
                                          >
                                            <FileCheck className="h-4 w-4" />
                                          </Button>
                                        )}

                                        {!docERP.rechazado && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            title="Rechazar documento"
                                            onClick={() => handleAdminAction(docERP, 'rechazar')}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <FileX className="h-4 w-4" />
                                          </Button>
                                        )}

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Solicitar actualización"
                                          onClick={() => handleAdminAction(docERP, 'solicitar_actualizacion')}
                                          className="text-blue-600 hover:text-blue-700"
                                        >
                                          <AlertCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center p-8">
                          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                          <p>No se encontraron documentos en el ERP</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de subida */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              {selectedDocTipo && documentosRequeridos.find(d => d.tipo === selectedDocTipo)?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FileUpload
              accept={{
                'application/pdf': ['.pdf'],
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
              }}
              maxSize={10 * 1024 * 1024}
              onFileSelect={setSelectedFile}
              label="Arrastra tu documento aquí"
              description="PDF, JPG o PNG (máx. 10MB)"
            />

            <Button
              onClick={handleUploadDocument}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Documento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar documento */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle>{documentoParaVer?.documentoRequerido || 'Documento'}</DialogTitle>
            <DialogDescription>
              {documentoParaVer?.nombreArchivo && (
                <span className="text-xs text-muted-foreground">
                  Archivo: {documentoParaVer.nombreArchivo}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-full min-h-[500px]">
            {loadingDocumento ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando documento...</span>
              </div>
            ) : documentoParaVer?.contenidoBase64 ? (
              documentoParaVer.tipoMime?.startsWith('image/') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`data:${documentoParaVer.tipoMime};base64,${documentoParaVer.contenidoBase64}`}
                    alt={documentoParaVer.nombreArchivo}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={`data:${documentoParaVer.tipoMime};base64,${documentoParaVer.contenidoBase64}`}
                  className="w-full h-full min-h-[500px] border-0"
                  title={documentoParaVer.nombreArchivo}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-8 w-8 mr-2" />
                No se pudo cargar el documento
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
            >
              Cerrar
            </Button>
            {documentoParaVer && (
              <Button
                onClick={() => handleDescargarDocumento(documentoParaVer)}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog para acciones de administrador */}
      <Dialog open={adminActionDialog !== null} onOpenChange={() => setAdminActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adminActionDialog === 'aprobar' && 'Aprobar Documento'}
              {adminActionDialog === 'rechazar' && 'Rechazar Documento'}
              {adminActionDialog === 'solicitar_actualizacion' && 'Solicitar Actualización'}
              {adminActionDialog === 'solicitar_documento' && 'Solicitar Documento'}
            </DialogTitle>
            <DialogDescription>
              {selectedDocForAction?.documentoRequerido} - {selectedDocForAction?.nombreArchivo || 'Sin archivo'}
            </DialogDescription>
          </DialogHeader>

          {adminActionDialog !== 'aprobar' && (
            <div className="space-y-2">
              <Label htmlFor="actionReason">
                {adminActionDialog === 'rechazar' && 'Motivo del rechazo'}
                {adminActionDialog === 'solicitar_actualizacion' && 'Observaciones'}
                {adminActionDialog === 'solicitar_documento' && 'Mensaje para el proveedor'}
              </Label>
              <textarea
                id="actionReason"
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder={
                  adminActionDialog === 'rechazar'
                    ? 'Describe el motivo del rechazo...'
                    : adminActionDialog === 'solicitar_actualizacion'
                      ? 'Describe qué necesita actualizarse...'
                      : 'Mensaje que se enviará al proveedor solicitando el documento...'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdminActionDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={executeAdminAction}
              disabled={processingAction || (adminActionDialog !== 'aprobar' && !actionReason.trim())}
              variant={adminActionDialog === 'rechazar' ? 'destructive' : 'default'}
            >
              {processingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {adminActionDialog === 'aprobar' && 'Aprobar'}
              {adminActionDialog === 'rechazar' && 'Rechazar'}
              {adminActionDialog === 'solicitar_actualizacion' && 'Solicitar Actualización'}
              {adminActionDialog === 'solicitar_documento' && 'Enviar Solicitud'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
