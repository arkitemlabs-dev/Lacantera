'use client';

import { useEffect, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mensaje } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface MensajesViewerProps {
  conversacionID: string;
  currentUser: {
    id: string;
    nombre: string;
    rol: string;
  };
  destinatario: {
    id: string;
    nombre: string;
  };
  asunto?: string;
}

export function MensajesViewer({
  conversacionID,
  currentUser,
  destinatario,
  asunto,
}: MensajesViewerProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMensajes();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMensajes, 10000);
    return () => clearInterval(interval);
  }, [conversacionID]);

  const fetchMensajes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/mensajes?conversacionID=${conversacionID}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar mensajes');
      }

      const data = await response.json();
      setMensajes(data.mensajes);

      // Mark unread messages as read
      const unreadMessages = data.mensajes.filter(
        (m: Mensaje) =>
          !m.leido && m.destinatarioID === currentUser.id
      );

      for (const mensaje of unreadMessages) {
        await fetch('/api/mensajes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensajeID: mensaje.mensajeID }),
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim()) {
      toast({
        title: 'Error',
        description: 'El mensaje no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);

      const response = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'mensaje',
          conversacionID,
          remitenteID: currentUser.id,
          remitenteNombre: currentUser.nombre,
          remitenteRol: currentUser.rol,
          destinatarioID: destinatario.id,
          destinatarioNombre: destinatario.nombre,
          mensaje: nuevoMensaje,
          asunto,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      setNuevoMensaje('');
      await fetchMensajes();

      toast({
        title: 'Mensaje enviado',
        description: 'Tu mensaje ha sido enviado correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Cargando mensajes...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Conversación</CardTitle>
        {asunto && <CardDescription>{asunto}</CardDescription>}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4 h-[400px]">
          <div className="space-y-4">
            {mensajes.map((mensaje) => {
              const isCurrentUser = mensaje.remitenteID === currentUser.id;
              const initials = mensaje.remitenteNombre
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={mensaje.mensajeID}
                  className={`flex gap-3 ${
                    isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 space-y-1 ${
                      isCurrentUser ? 'items-end' : 'items-start'
                    } flex flex-col`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {mensaje.remitenteNombre}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(mensaje.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>

                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {mensaje.mensaje}
                      </p>

                      {mensaje.archivosJSON && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <div className="flex items-center gap-2 text-xs">
                            <Paperclip className="h-3 w-3" />
                            <span>
                              {JSON.parse(mensaje.archivosJSON).length}{' '}
                              archivo(s)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribe tu mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEnviarMensaje();
              }
            }}
            rows={3}
            disabled={sending}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleEnviarMensaje}
              disabled={sending || !nuevoMensaje.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
