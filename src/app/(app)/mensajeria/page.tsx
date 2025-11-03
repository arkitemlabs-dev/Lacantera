
'use client';

import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { suppliers } from '@/lib/data';
import { Paperclip, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const conversations = [
  {
    id: 1,
    name: 'Aceros del Norte S.A. de C.V.',
    subject: 'Duda sobre OC-128',
    time: '10:30 AM',
    unread: true,
    avatar: 'A',
    messages: [
        {
            id: 1,
            author: 'Aceros del Norte S.A. de C.V.',
            avatar: 'A',
            text: 'Buenos días, tenemos una duda sobre la orden de compra OC-128.',
            time: '10:30 AM',
            isCurrentUser: false,
        },
        {
            id: 2,
            author: 'Juan Pérez (Admin)',
            avatar: 'JP',
            text: 'Buen día, ¿cuál es su duda?',
            time: '10:31 AM',
            isCurrentUser: true,
        },
        {
            id: 3,
            author: 'Aceros del Norte S.A. de C.V.',
            avatar: 'A',
            text: 'El precio del item "Resma de papel" no coincide con nuestra cotización.',
            time: '10:32 AM',
            isCurrentUser: false,
        },
    ]
  },
  {
    id: 2,
    name: 'Logística Express Mexicana',
    subject: 'Revisión Factura A-5832',
    time: 'Ayer',
    unread: false,
    avatar: 'L',
    messages: [
        {
            id: 1,
            author: 'Logística Express Mexicana',
            avatar: 'L',
            text: 'Buenas tardes, ¿hay alguna actualización sobre la factura A-5832?',
            time: 'Ayer, 3:45 PM',
            isCurrentUser: false,
        },
        {
            id: 2,
            author: 'Maria García (Admin)',
            avatar: 'MG',
            text: 'Hola, sí. Fue aprobada esta mañana. Deberían ver el cambio de estado en el portal.',
            time: 'Ayer, 3:50 PM',
            isCurrentUser: true,
        },
    ]
  },
  {
    id: 3,
    name: 'Componentes Electrónicos Globales',
    subject: 'Problema al subir documento',
    time: '2d',
    unread: false,
    avatar: 'C',
    messages: [
        {
            id: 1,
            author: 'Componentes Electrónicos Globales',
            avatar: 'C',
            text: 'Hola, estamos teniendo problemas para subir el acta constitutiva. El sistema muestra un error.',
            time: 'Hace 2 días',
            isCurrentUser: false,
        }
    ]
  },
];

export default function MensajeriaPage() {
  const [supplierFilter, setSupplierFilter] = useState('todos');
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);

  const filteredConversations = useMemo(() => {
    if (supplierFilter === 'todos') {
      return conversations;
    }
    const supplierName = suppliers.find(s => s.id === supplierFilter)?.name;
    return conversations.filter(conv => conv.name === supplierName);
  }, [supplierFilter]);

  return (
    <Dialog>
      <div className="grid h-[calc(100vh_-_theme(spacing.16))] grid-cols-1 md:grid-cols-[350px_1fr]">
        {/* Conversation List */}
        <div className="flex flex-col border-r bg-muted/40">
          <div className="p-4">
            <h1 className="text-2xl font-bold">Mensajes</h1>
            <div className="flex items-center gap-2 mt-4">
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar por proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proveedores</SelectItem>
                  {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogTrigger asChild>
                <Button>Nuevo Ticket</Button>
              </DialogTrigger>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1 p-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted",
                      selectedConversation?.id === conv.id ? 'bg-muted' : 'bg-background/50'
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{conv.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">{conv.name}</div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.subject}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>{conv.time}</span>
                      {conv.unread && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary"></span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex flex-col">
          {selectedConversation ? (
            <Card className="flex-1 flex flex-col rounded-none border-0 shadow-none">
              <CardHeader className="border-b">
                <h2 className="text-xl font-semibold">{selectedConversation.name}</h2>
                <p className="text-sm text-muted-foreground">Ticket: {selectedConversation.subject}</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-3 ${
                      message.isCurrentUser ? 'justify-end' : ''
                    }`}
                  >
                    {!message.isCurrentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{message.avatar}</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-md rounded-lg p-3 ${
                        message.isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 text-right ${message.isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {message.time}
                      </p>
                    </div>
                    {message.isCurrentUser && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{message.avatar}</AvatarFallback>
                        </Avatar>
                    )}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="p-4 border-t bg-background">
                <div className="relative w-full">
                  <Input
                    placeholder="Escriba su mensaje..."
                    className="pr-24"
                  />
                  <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button size="sm">
                      Enviar
                      <Send className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ) : (
             <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <p>Seleccione una conversación para ver los mensajes.</p>
            </div>
          )}
        </div>

        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nuevo Mensaje</DialogTitle>
                <DialogDescription>
                    Crea un nuevo ticket para comunicarte con un proveedor.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="destinatario" className="text-right">
                        Destinatario
                    </Label>
                    <Select>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Seleccione un proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                            {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="asunto" className="text-right">
                        Asunto
                    </Label>
                    <Input id="asunto" placeholder="Ej. Duda sobre la orden de compra OC-128" className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mensaje" className="text-right">
                        Mensaje
                    </Label>
                    <Textarea id="mensaje" placeholder="Escribe tu mensaje aquí..." className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Cancelar
                    </Button>
                </DialogClose>
                <Button type="submit">Enviar Mensaje</Button>
            </DialogFooter>
        </DialogContent>
      </div>
    </Dialog>
  );
}
