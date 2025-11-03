
'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Paperclip, Send } from 'lucide-react';
import Link from 'next/link';
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
    subject: 'Duda sobre OC-128',
    time: '10:30 AM',
    unread: true,
  },
  {
    id: 2,
    subject: 'Revisión Factura A-5832',
    time: 'Ayer',
    unread: false,
  },
  {
    id: 3,
    subject: 'Problema al subir documento',
    time: '2d',
    unread: false,
  },
];

const messages = [
  {
    id: 1,
    author: 'Aceros del Norte S.A. de C.V.',
    avatar: 'A',
    text: 'Buenos días, tenemos una duda sobre la orden de compra OC-128.',
    time: '10:30 AM',
    isCurrentUser: true,
  },
  {
    id: 2,
    author: 'Juan Pérez (La Cantera)',
    avatar: 'JP',
    text: 'Buen día, ¿cuál es su duda?',
    time: '10:31 AM',
    isCurrentUser: false,
  },
  {
    id: 3,
    author: 'Aceros del Norte S.A. de C.V.',
    avatar: 'A',
    text: 'El precio del item "Resma de papel" no coincide con nuestra cotización.',
    time: '10:32 AM',
    isCurrentUser: true,
  },
];

export default function MensajeriaProveedorPage() {
  return (
    <Dialog>
    <div className="grid h-[calc(100vh_-_theme(spacing.16))] grid-cols-1 md:grid-cols-[350px_1fr]">
      {/* Conversation List */}
      <div className="flex flex-col border-r bg-card/70">
        <div className="p-4 border-b">
           <div className="flex items-center justify-between">
             <h1 className="text-2xl font-bold">Mensajes</h1>
             <DialogTrigger asChild>
                <Button>Nuevo Ticket</Button>
            </DialogTrigger>
           </div>
           <p className="text-sm text-muted-foreground mt-2">Comunícate con el equipo de La Cantera.</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1 p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted bg-background/50"
              >
                <div className="flex-1">
                  <div className="font-semibold">{conv.subject}</div>
                  <p className="text-sm text-muted-foreground truncate">
                    Ticket #{conv.id}
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
        <Card className="flex-1 flex flex-col rounded-none border-0 shadow-none bg-muted/40">
          <CardHeader className="border-b bg-background">
            <h2 className="text-xl font-semibold">Duda sobre OC-128</h2>
            <p className="text-sm text-muted-foreground">Ticket: #1</p>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
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
                      : 'bg-background'
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
      </div>

      <DialogContent>
            <DialogHeader>
                <DialogTitle>Nuevo Ticket de Soporte</DialogTitle>
                <DialogDescription>
                    Crea un nuevo ticket para comunicarte con el equipo de La Cantera.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
