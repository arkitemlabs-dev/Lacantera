// src/components/mensajeria/MensajeriaInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Send,
  Paperclip,
  Search,
  MoreVertical,
  MessageSquarePlus,
  Archive,
  Clock,
  Check,
  CheckCheck,
  Download,
  X,
  User
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

import { useMensajeria } from '@/hooks/useMensajeria';
import type { Conversacion, Mensaje, ArchivoMensaje } from '@/types/backend';

interface MensajeriaInterfaceProps {
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  empresaId: string;
}

export function MensajeriaInterface({
  usuarioId,
  usuarioNombre,
  usuarioRol,
  empresaId
}: MensajeriaInterfaceProps) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarNuevaConversacion, setMostrarNuevaConversacion] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mensajesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversaciones,
    conversacionActiva,
    mensajes,
    cargando,
    enviando,
    error,
    mensajesNoLeidos,
    seleccionarConversacion,
    enviarNuevoMensaje,
    crearNuevaConversacion,
    marcarComoLeido
  } = useMensajeria(usuarioId, usuarioNombre, usuarioRol, empresaId);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (mensajesEndRef.current) {
      mensajesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  // Marcar como leído al seleccionar conversación
  useEffect(() => {
    if (conversacionActiva) {
      marcarComoLeido();
    }
  }, [conversacionActiva, marcarComoLeido]);

  const conversacionesFiltradas = conversaciones.filter(conv =>
    conv.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
    conv.participantesInfo.some(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const handleEnviarMensaje = async () => {
    if (!nuevoMensaje.trim() && archivosAdjuntos.length === 0) return;

    const exito = await enviarNuevoMensaje(nuevoMensaje, archivosAdjuntos);
    
    if (exito) {
      setNuevoMensaje('');
      setArchivosAdjuntos([]);
      toast({
        title: 'Mensaje enviado',
        description: 'Tu mensaje ha sido enviado correctamente.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleArchivoAdjunto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tamaño (10MB max por archivo)
    const archivosValidos = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Archivo muy grande',
          description: `${file.name} supera los 10MB permitidos.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setArchivosAdjuntos(prev => [...prev, ...archivosValidos]);
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removerArchivo = (index: number) => {
    setArchivosAdjuntos(prev => prev.filter((_, i) => i !== index));
  };

  const formatearFecha = (fecha: Date | string) => {
    const fechaObj = new Date(fecha);
    
    if (isToday(fechaObj)) {
      return format(fechaObj, 'HH:mm', { locale: es });
    } else if (isYesterday(fechaObj)) {
      return 'Ayer';
    } else {
      return format(fechaObj, 'dd/MM', { locale: es });
    }
  };

  const formatearFechaCompleta = (fecha: Date | string) => {
    const fechaObj = new Date(fecha);
    
    if (isToday(fechaObj)) {
      return format(fechaObj, 'HH:mm', { locale: es });
    } else if (isYesterday(fechaObj)) {
      return `Ayer a las ${format(fechaObj, 'HH:mm', { locale: es })}`;
    } else {
      return format(fechaObj, 'dd/MM/yyyy HH:mm', { locale: es });
    }
  };

  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const obtenerOtroParticipante = (conversacion: Conversacion) => {
    return conversacion.participantesInfo.find(p => p.uid !== usuarioId);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background border rounded-lg overflow-hidden">
      {/* Panel izquierdo - Lista de conversaciones */}
      <div className="w-1/3 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mensajes</h2>
            <Dialog open={mostrarNuevaConversacion} onOpenChange={setMostrarNuevaConversacion}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <NuevaConversacionDialog
                usuarioId={usuarioId}
                usuarioNombre={usuarioNombre}
                usuarioRol={usuarioRol}
                empresaId={empresaId}
                onConversacionCreada={(conversacionId) => {
                  setMostrarNuevaConversacion(false);
                  seleccionarConversacion(conversacionId);
                }}
                crearNuevaConversacion={crearNuevaConversacion}
              />
            </Dialog>
          </div>
          
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar conversaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Contador de mensajes no leídos */}
          {mensajesNoLeidos > 0 && (
            <div className="text-sm text-muted-foreground">
              {mensajesNoLeidos} mensaje{mensajesNoLeidos !== 1 ? 's' : ''} sin leer
            </div>
          )}
        </div>

        {/* Lista de conversaciones */}
        <ScrollArea className="flex-1">
          {cargando ? (
            <div className="p-4 text-center text-muted-foreground">
              Cargando conversaciones...
            </div>
          ) : conversacionesFiltradas.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {busqueda ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversacionesFiltradas.map((conversacion) => {
                const otroParticipante = obtenerOtroParticipante(conversacion);
                const noLeidos = conversacion.noLeidos[usuarioId] || 0;
                const esActiva = conversacionActiva?.id === conversacion.id;

                return (
                  <div
                    key={conversacion.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      esActiva
                        ? 'bg-accent'
                        : noLeidos > 0
                          ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary'
                          : 'hover:bg-accent/50'
                    }`}
                    onClick={() => seleccionarConversacion(conversacion.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className={`h-10 w-10 ${noLeidos > 0 ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                        <AvatarFallback>
                          {getIniciales(otroParticipante?.nombre || 'Usuario')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${noLeidos > 0 ? 'font-bold text-foreground' : 'font-medium'}`}>
                            {otroParticipante?.nombre || 'Usuario'}
                          </p>
                          <span className={`text-xs ${noLeidos > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                            {formatearFecha(conversacion.ultimoMensajeFecha)}
                          </span>
                        </div>

                        <p className={`text-sm truncate ${noLeidos > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {conversacion.asunto}
                        </p>

                        <p className={`text-xs truncate mt-1 ${noLeidos > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                          {conversacion.ultimoMensajeRemitente === usuarioNombre && 'Tú: '}
                          {conversacion.ultimoMensaje}
                        </p>
                      </div>

                      {noLeidos > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] text-xs">
                          {noLeidos}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Panel derecho - Chat activo */}
      <div className="flex-1 flex flex-col">
        {conversacionActiva ? (
          <>
            {/* Header del chat */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {getIniciales(
                      obtenerOtroParticipante(conversacionActiva)?.nombre || 'Usuario'
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {obtenerOtroParticipante(conversacionActiva)?.nombre || 'Usuario'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {conversacionActiva.asunto}
                  </p>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar conversación
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mensajes */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {mensajes.map((mensaje) => {
                  const esMio = mensaje.remitenteId === usuarioId;
                  
                  return (
                    <div
                      key={mensaje.id}
                      className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          esMio
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {!esMio && (
                          <p className="text-xs font-semibold mb-1">
                            {mensaje.remitenteNombre}
                          </p>
                        )}
                        
                        <div className="whitespace-pre-wrap text-sm">
                          {mensaje.mensaje}
                        </div>
                        
                        {/* Archivos adjuntos */}
                        {mensaje.archivos && mensaje.archivos.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {mensaje.archivos.map((archivo, index) => (
                              <ArchivoMensajeComponent
                                key={index}
                                archivo={archivo}
                                usuarioId={usuarioId}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-end mt-2 text-xs ${
                          esMio ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          <span>{formatearFechaCompleta(mensaje.createdAt)}</span>
                          {esMio && (
                            <div className="ml-2">
                              {mensaje.leido ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={mensajesEndRef} />
              </div>
            </ScrollArea>

            {/* Área de escritura */}
            <div className="p-4 border-t">
              {/* Archivos adjuntos */}
              {archivosAdjuntos.length > 0 && (
                <div className="mb-3 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Archivos adjuntos:</div>
                  <div className="space-y-2">
                    {archivosAdjuntos.map((archivo, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="truncate">{archivo.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerArchivo(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-end space-x-2">
                <div className="flex-1">
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
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleArchivoAdjunto}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  />
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleEnviarMensaje}
                    disabled={enviando || (!nuevoMensaje.trim() && archivosAdjuntos.length === 0)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Selecciona una conversación</h3>
              <p className="text-muted-foreground">
                Elige una conversación del panel izquierdo para empezar a chatear
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para archivos de mensaje
function ArchivoMensajeComponent({
  archivo,
  usuarioId
}: {
  archivo: ArchivoMensaje;
  usuarioId: string;
}) {
  const handleDescargar = async () => {
    try {
      const { getDownloadUrlMensaje } = await import('@/app/actions/mensajes');
      const response = await getDownloadUrlMensaje(archivo.url, usuarioId);
      
      if (response.success) {
        window.open(response.data.url, '_blank');
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo descargar el archivo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error descargando archivo:', error);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-background/10 rounded">
      <Paperclip className="h-3 w-3" />
      <span className="text-xs truncate flex-1">{archivo.nombre}</span>
      <Button size="sm" variant="ghost" onClick={handleDescargar}>
        <Download className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Componente para nueva conversación
function NuevaConversacionDialog({
  usuarioId,
  usuarioNombre,
  usuarioRol,
  empresaId,
  onConversacionCreada,
  crearNuevaConversacion
}: {
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  empresaId: string;
  onConversacionCreada: (conversacionId: string) => void;
  crearNuevaConversacion: any;
}) {
  const [destinatario, setDestinatario] = useState('');
  const [destinatarioNombre, setDestinatarioNombre] = useState('');
  const [busquedaDestinatario, setBusquedaDestinatario] = useState('');
  const [mostrarListaDestinatarios, setMostrarListaDestinatarios] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const inputDestinatarioRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar usuarios disponibles para nueva conversación
    const cargarUsuarios = async () => {
      setCargandoUsuarios(true);
      try {
        const { getUsuariosParaConversacion } = await import('@/app/actions/mensajes');
        const response = await getUsuariosParaConversacion(usuarioId, empresaId, usuarioRol);

        if (response.success) {
          // Ordenar alfabéticamente por nombre
          const usuariosOrdenados = (response.data || []).sort((a: any, b: any) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
          );
          setUsuarios(usuariosOrdenados);
        }
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      } finally {
        setCargandoUsuarios(false);
      }
    };

    cargarUsuarios();
  }, [usuarioId, empresaId, usuarioRol]);

  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        listaRef.current &&
        !listaRef.current.contains(event.target as Node) &&
        inputDestinatarioRef.current &&
        !inputDestinatarioRef.current.contains(event.target as Node)
      ) {
        setMostrarListaDestinatarios(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar usuarios por búsqueda
  const usuariosFiltrados = usuarios.filter(usuario =>
    (usuario.nombre || '').toLowerCase().includes(busquedaDestinatario.toLowerCase()) ||
    String(usuario.id || '').toLowerCase().includes(busquedaDestinatario.toLowerCase())
  );

  const handleSeleccionarDestinatario = (usuario: any) => {
    // Asegurar que el ID sea string para coincidir con user.id de sesión
    setDestinatario(String(usuario.id));
    setDestinatarioNombre(usuario.nombre);
    setBusquedaDestinatario(usuario.nombre);
    setMostrarListaDestinatarios(false);
  };

  const handleCrear = async () => {
    if (!destinatario || !asunto || !mensaje) return;

    setCargando(true);
    try {
      const usuarioDestino = usuarios.find(u => String(u.id) === destinatario);

      const conversacionId = await crearNuevaConversacion({
        destinatarioId: destinatario,
        destinatarioNombre: usuarioDestino?.nombre || 'Usuario',
        asunto,
        mensaje,
        archivos
      });

      if (conversacionId) {
        // Mostrar mensaje de confirmación
        toast({
          title: 'Mensaje enviado',
          description: `Tu mensaje ha sido enviado a ${usuarioDestino?.nombre || 'el proveedor'}.`,
        });

        onConversacionCreada(conversacionId);

        // Limpiar formulario
        setDestinatario('');
        setDestinatarioNombre('');
        setBusquedaDestinatario('');
        setAsunto('');
        setMensaje('');
        setArchivos([]);
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear la conversación. Intenta de nuevo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creando conversación:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al enviar el mensaje. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Nueva Conversación</DialogTitle>
        <DialogDescription>
          {usuarioRol === 'proveedor'
            ? 'Envía un mensaje al equipo de La Cantera.'
            : 'Inicia una nueva conversación con un proveedor.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="relative">
          <label className="text-sm font-medium">Destinatario</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputDestinatarioRef}
              placeholder={cargandoUsuarios
                ? (usuarioRol === 'proveedor' ? "Cargando contactos..." : "Cargando proveedores...")
                : (usuarioRol === 'proveedor' ? "Buscar por nombre o área..." : "Buscar proveedor por nombre...")}
              value={busquedaDestinatario}
              onChange={(e) => {
                setBusquedaDestinatario(e.target.value);
                setMostrarListaDestinatarios(true);
                // Si cambia el texto, limpiar selección
                if (e.target.value !== destinatarioNombre) {
                  setDestinatario('');
                  setDestinatarioNombre('');
                }
              }}
              onFocus={() => setMostrarListaDestinatarios(true)}
              className="pl-9"
              disabled={cargandoUsuarios}
            />
            {destinatario && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setDestinatario('');
                  setDestinatarioNombre('');
                  setBusquedaDestinatario('');
                  inputDestinatarioRef.current?.focus();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Lista desplegable de proveedores */}
          {mostrarListaDestinatarios && !cargandoUsuarios && (
            <div
              ref={listaRef}
              className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-hidden"
            >
              <ScrollArea className="h-full max-h-60">
                {usuariosFiltrados.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {busquedaDestinatario
                      ? (usuarioRol === 'proveedor' ? 'No se encontraron contactos' : 'No se encontraron proveedores')
                      : (usuarioRol === 'proveedor' ? 'Escribe para buscar contactos' : 'Escribe para buscar proveedores')}
                  </div>
                ) : (
                  <div className="p-1">
                    {usuariosFiltrados.map((usuario) => (
                      <div
                        key={usuario.id}
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                          destinatario === String(usuario.id)
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleSeleccionarDestinatario(usuario)}
                      >
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{usuario.nombre}</p>
                          <p className="text-xs text-muted-foreground">{usuario.email}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">{usuario.rol}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {usuariosFiltrados.length > 0 && (
                <div className="p-2 border-t text-xs text-muted-foreground text-center">
                  {usuariosFiltrados.length} {usuarioRol === 'proveedor' ? 'contacto' : 'proveedor'}{usuariosFiltrados.length !== 1 ? (usuarioRol === 'proveedor' ? 's' : 'es') : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Asunto</label>
          <Input
            placeholder="Asunto de la conversación"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Mensaje</label>
          <Textarea
            placeholder="Escribe tu mensaje..."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setDestinatario('');
              setDestinatarioNombre('');
              setBusquedaDestinatario('');
              setAsunto('');
              setMensaje('');
              setArchivos([]);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCrear}
            disabled={cargando || !destinatario || !asunto || !mensaje}
          >
            {cargando ? 'Creando...' : 'Crear Conversación'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}