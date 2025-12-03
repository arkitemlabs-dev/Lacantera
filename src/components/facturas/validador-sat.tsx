'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Upload, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function ValidadorSAT() {
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [uuid, setUuid] = useState('');
  const [rfcEmisor, setRfcEmisor] = useState('');
  const [rfcReceptor, setRfcReceptor] = useState('');
  const [total, setTotal] = useState('');
  const { toast } = useToast();

  const handleValidarDatos = async () => {
    if (!uuid || !rfcEmisor || !rfcReceptor || !total) {
      toast({
        title: 'Error',
        description: 'Todos los campos son requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setValidando(true);
      setResultado(null);

      const response = await fetch('/api/facturas/validar-sat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'datos',
          datos: {
            uuid,
            rfcEmisor: rfcEmisor.toUpperCase(),
            rfcReceptor: rfcReceptor.toUpperCase(),
            total: parseFloat(total),
          },
          validarConSAT: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al validar');
      }

      const data = await response.json();
      setResultado(data.resultado);

      toast({
        title: data.resultado.valido ? 'CFDI Válido' : 'CFDI Inválido',
        description: data.resultado.mensaje || 'Validación completada',
        variant: data.resultado.valido ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo validar el CFDI',
        variant: 'destructive',
      });
    } finally {
      setValidando(false);
    }
  };

  const handleValidarXML = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast({
        title: 'Error',
        description: 'El archivo debe ser un XML',
        variant: 'destructive',
      });
      return;
    }

    try {
      setValidando(true);
      setResultado(null);

      const xmlContent = await file.text();

      const response = await fetch('/api/facturas/validar-sat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'xml',
          xmlContent,
          validarConSAT: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al validar');
      }

      const data = await response.json();
      setResultado(data.resultado);

      // Si se extrajeron datos, llenar el formulario
      if (data.resultado.datos) {
        setUuid(data.resultado.datos.uuid);
        setRfcEmisor(data.resultado.datos.rfcEmisor);
        setRfcReceptor(data.resultado.datos.rfcReceptor);
        setTotal(data.resultado.datos.total.toString());
      }

      toast({
        title: data.resultado.valido ? 'CFDI Válido' : 'CFDI Inválido',
        description: data.resultado.mensaje || 'Validación completada',
        variant: data.resultado.valido ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo validar el XML',
        variant: 'destructive',
      });
    } finally {
      setValidando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validador SAT</CardTitle>
        <CardDescription>
          Valida facturas electrónicas (CFDI) contra el SAT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subir XML */}
        <div className="space-y-2">
          <Label>Subir XML CFDI</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleValidarXML(file);
              }}
              disabled={validando}
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            O ingresa los datos manualmente:
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Formulario manual */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uuid">UUID / Folio Fiscal</Label>
            <Input
              id="uuid"
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              disabled={validando}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rfcEmisor">RFC Emisor</Label>
              <Input
                id="rfcEmisor"
                placeholder="ABC123456XYZ"
                value={rfcEmisor}
                onChange={(e) => setRfcEmisor(e.target.value.toUpperCase())}
                disabled={validando}
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfcReceptor">RFC Receptor</Label>
              <Input
                id="rfcReceptor"
                placeholder="XYZ987654ABC"
                value={rfcReceptor}
                onChange={(e) => setRfcReceptor(e.target.value.toUpperCase())}
                disabled={validando}
                maxLength={13}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total (MXN)</Label>
            <Input
              id="total"
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              disabled={validando}
            />
          </div>

          <Button
            onClick={handleValidarDatos}
            disabled={validando}
            className="w-full"
          >
            {validando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando con SAT...
              </>
            ) : (
              'Validar CFDI'
            )}
          </Button>
        </div>

        {/* Resultado */}
        {resultado && (
          <Alert
            variant={resultado.valido ? 'default' : 'destructive'}
            className="mt-4"
          >
            <div className="flex items-start gap-3">
              {resultado.valido ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="flex-1 space-y-2">
                <AlertDescription className="font-semibold">
                  {resultado.mensaje || resultado.error}
                </AlertDescription>

                {resultado.estado && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">Estado: {resultado.estado}</Badge>
                    {resultado.codigoEstatus && (
                      <Badge variant="outline">
                        Código: {resultado.codigoEstatus}
                      </Badge>
                    )}
                    {resultado.esCancelable && (
                      <Badge variant="outline">
                        Cancelable: {resultado.esCancelable}
                      </Badge>
                    )}
                  </div>
                )}

                {resultado.datos && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <p>UUID: {resultado.datos.uuid}</p>
                    <p>RFC Emisor: {resultado.datos.rfcEmisor}</p>
                    <p>RFC Receptor: {resultado.datos.rfcReceptor}</p>
                    <p>Total: ${resultado.datos.total.toFixed(2)} MXN</p>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
