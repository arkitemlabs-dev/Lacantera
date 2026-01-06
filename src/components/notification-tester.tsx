'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/providers';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Users } from 'lucide-react';

export function NotificationTester() {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const { user } = useAuth();
  const { empresaSeleccionada } = useEmpresa();

  const enviarNotificacionPrueba = async () => {
    if (!titulo || !mensaje || !destinatarioId || !empresaSeleccionada) {
      setResultado('❌ Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    setResultado(null);
    
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: parseInt(destinatarioId),
          usuarioNombre: 'Usuario Prueba',
          tipo: 'mensaje_prueba',
          titulo,
          mensaje,
          link: '/test-notifications',
          prioridad: 'normal'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResultado(`✅ Notificación enviada correctamente (ID: ${data.notificacionID})`);
        setTitulo('');
        setMensaje('');
        setDestinatarioId('');
      } else {
        const error = await response.json();
        setResultado(`❌ Error: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResultado('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const llenarEjemplo = () => {
    setTitulo('Mensaje de prueba');
    setMensaje('Este es un mensaje de prueba para verificar que las notificaciones funcionan correctamente.');
    setDestinatarioId(user?.id || '');
  };

  if (!user || !empresaSeleccionada) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Probar Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">ID Destinatario</label>
          <Input
            value={destinatarioId}
            onChange={(e) => setDestinatarioId(e.target.value)}
            placeholder="ID del usuario destinatario"
            type="number"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Título</label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la notificación"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Mensaje</label>
          <Textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Contenido del mensaje"
            rows={3}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={enviarNotificacionPrueba}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
          
          <Button 
            onClick={llenarEjemplo}
            variant="outline"
            disabled={loading}
          >
            Ejemplo
          </Button>
        </div>
        
        {resultado && (
          <div className={`p-3 rounded-lg text-sm ${
            resultado.startsWith('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {resultado}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>Usuario actual: {user.name} (ID: {user.id})</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {empresaSeleccionada.nombre}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}