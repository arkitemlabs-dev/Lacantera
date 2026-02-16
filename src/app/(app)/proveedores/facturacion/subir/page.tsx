'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileUpload } from '@/components/upload/file-upload';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SubirFacturaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ordenCompraId, setOrdenCompraId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!xmlFile || !ordenCompraId) {
      setResult({
        success: false,
        error: 'Por favor selecciona el archivo XML e ingresa la orden de compra',
      });
      return;
    }

    const empresaCode = (session?.user as any)?.empresaActual;

    if (!empresaCode) {
      setResult({
        success: false,
        error: 'No se ha detectado una empresa seleccionada en la sesión. Por favor recarga o vuelve a iniciar sesión.'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('xml', xmlFile);
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }
      formData.append('empresa_code', empresaCode);
      formData.append('orden_compra_id', ordenCompraId);

      const response = await fetch('/api/proveedor/facturas/upload', {
        method: 'POST',
        body: formData,
      });

      // Manejar respuestas no-JSON (servidor crasheó o devolvió HTML)
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Respuesta no-JSON del servidor:', response.status, text.substring(0, 500));
        data = {
          success: false,
          error: `Error del servidor (${response.status}): ${text.substring(0, 200) || 'Respuesta vacía'}`,
        };
      }

      setResult(data);

      if (data.success) {
        setTimeout(() => {
          router.push('/proveedores/facturacion');
        }, 2000);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Error al subir factura',
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = xmlFile && ordenCompraId.trim() !== '' && !loading;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">
          Inicio
        </Link>
        <span>&gt;</span>
        <Link href="/proveedores/facturacion" className="hover:text-foreground">
          Facturación
        </Link>
        <span>&gt;</span>
        <span className="text-foreground">Subir Factura</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Regresar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Subir Nueva Factura</CardTitle>
          <CardDescription>
            Carga los archivos XML y PDF de tu factura para revisión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Archivo XML (CFDI) *</Label>
            <FileUpload
              accept={{ 'text/xml': ['.xml'] }}
              maxSize={5 * 1024 * 1024}
              onFileSelect={setXmlFile}
              label="Arrastra el archivo XML aquí"
              description="Archivo XML del CFDI"
            />
          </div>

          <div className="space-y-2">
            <Label>Archivo PDF (opcional)</Label>
            <FileUpload
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSize={10 * 1024 * 1024}
              onFileSelect={setPdfFile}
              label="Arrastra el archivo PDF aquí"
              description="Representación impresa de la factura"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordenCompra">Orden de Compra *</Label>
            <Input
              id="ordenCompra"
              type="text"
              placeholder="ID de la orden de compra"
              value={ordenCompraId}
              onChange={(e) => setOrdenCompraId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el ID de la orden de compra asociada (consulta tus ordenes pendientes)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>

          {result && (
            <Alert
              variant={result.success ? 'default' : 'destructive'}
              className={
                result.success ? 'border-green-500 bg-green-500/10' : ''
              }
            >
              {result.success && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              <AlertTitle>
                {result.success ? '¡Factura subida exitosamente!' : 'Error'}
              </AlertTitle>
              <AlertDescription>
                {result.success
                  ? 'Redirigiendo...'
                  : result.error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Subir Factura'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
