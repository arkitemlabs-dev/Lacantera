'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Conversacion } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversacionListaProps {
  empresa: string;
  onSelectConversacion: (conversacionID: string) => void;
  selectedConversacionID?: string;
}

export function ConversacionLista({
  empresa,
  onSelectConversacion,
  selectedConversacionID,
}: ConversacionListaProps) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversaciones();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchConversaciones, 30000);
    return () => clearInterval(interval);
  }, [empresa]);

  const fetchConversaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mensajes?empresa=${empresa}`);

      if (!response.ok) {
        throw new Error('Error al cargar conversaciones');
      }

      const data = await response.json();
      setConversaciones(data.conversaciones);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Cargando conversaciones...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (conversaciones.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay conversaciones aún
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversaciones
        </CardTitle>
        <CardDescription>
          {conversaciones.length} conversación(es)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {conversaciones.map((conv) => {
              const participantes = JSON.parse(conv.participantesJSON);
              const mensajesNoLeidos = conv.ultimoMensajeLeido === false ? 1 : 0;

              return (
                <Button
                  key={conv.conversacionID}
                  variant={
                    selectedConversacionID === conv.conversacionID
                      ? 'secondary'
                      : 'ghost'
                  }
                  className="w-full justify-start h-auto p-4"
                  onClick={() => onSelectConversacion(conv.conversacionID)}
                >
                  <div className="flex flex-col items-start gap-2 w-full">
                    <div className="flex items-center justify-between w-full">
                      <p className="font-semibold">{conv.asunto}</p>
                      {mensajesNoLeidos > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {mensajesNoLeidos}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{participantes.length} participante(s)</span>
                    </div>

                    {conv.ultimoMensaje && (
                      <p className="text-sm text-muted-foreground truncate w-full text-left">
                        {conv.ultimoMensaje}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(conv.ultimoMensajeFecha), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
