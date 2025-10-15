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
import { Paperclip, Send } from 'lucide-react';

const conversations = [
  {
    id: 1,
    name: 'Compras',
    subject: 'Duda sobre OC-128',
    time: '10:30 AM',
    unread: true,
    avatar: 'C',
  },
  {
    id: 2,
    name: 'Contabilidad',
    subject: 'Revisión Factura A-5832',
    time: 'Ayer',
    unread: false,
    avatar: 'C',
  },
  {
    id: 3,
    name: 'Soporte Técnico',
    subject: 'Problema al subir documento',
    time: '2d',
    unread: false,
    avatar: 'S',
  },
];

const messages = [
  {
    id: 1,
    author: 'Compras',
    avatar: 'C',
    text: 'Buenos días, tenemos una duda sobre la orden de compra OC-128.',
    time: '10:30 AM',
    isCurrentUser: false,
  },
   {
    id: 2,
    author: 'Juan Pérez',
    avatar: 'JP',
    text: 'Buen día, ¿cuál es su duda?',
    time: '10:31 AM',
    isCurrentUser: true,
  },
  {
    id: 3,
    author: 'Compras',
    avatar: 'C',
    text: 'El precio del item "Resma de papel" no coincide con nuestra cotización.',
    time: '10:32 AM',
    isCurrentUser: false,
  },
];

export default function MensajeriaPage() {
  return (
    <div className="grid h-[calc(100vh_-_theme(spacing.16))] grid-cols-1 md:grid-cols-[350px_1fr]">
      {/* Conversation List */}
      <div className="flex flex-col border-r bg-muted/40">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Mensajes</h1>
          <div className="flex items-center gap-2 mt-4">
            <Select defaultValue="compras">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compras">Compras</SelectItem>
                <SelectItem value="contabilidad">Contabilidad</SelectItem>
                <SelectItem value="soporte">Soporte Técnico</SelectItem>
              </SelectContent>
            </Select>
            <Button>Nuevo Ticket</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1 p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted bg-card"
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
        <Card className="flex-1 flex flex-col rounded-none border-0 shadow-none">
          <CardHeader className="border-b">
            <h2 className="text-xl font-semibold">Compras</h2>
            <p className="text-sm text-muted-foreground">Duda sobre OC-128</p>
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
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                   <p className={`text-xs mt-1 ${message.isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="p-4 border-t">
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
    </div>
  );
}
