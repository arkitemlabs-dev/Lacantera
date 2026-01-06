import { NotificationTester } from '@/components/notification-tester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Zap, CheckCircle } from 'lucide-react';

export default function TestNotificationsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Sistema de Notificaciones en Tiempo Real
        </h1>
        <p className="text-muted-foreground">
          Prueba y verifica el funcionamiento de las notificaciones en tiempo real
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <NotificationTester />
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Cómo Funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Server-Sent Events (SSE)</h4>
                  <p className="text-sm text-muted-foreground">
                    Conexión en tiempo real que mantiene el navegador conectado al servidor
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Bell className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Notificaciones Instantáneas</h4>
                  <p className="text-sm text-muted-foreground">
                    Las notificaciones aparecen inmediatamente sin necesidad de recargar
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Persistencia</h4>
                  <p className="text-sm text-muted-foreground">
                    Las notificaciones se guardan en la base de datos y persisten entre sesiones
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Instrucciones de Prueba</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    1
                  </Badge>
                  <span>Ingresa el ID del usuario destinatario (puedes usar tu propio ID)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    2
                  </Badge>
                  <span>Escribe un título y mensaje descriptivo</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    3
                  </Badge>
                  <span>Haz clic en "Enviar Notificación"</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    4
                  </Badge>
                  <span>Observa cómo aparece inmediatamente en el ícono de notificaciones</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Casos de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• <strong>Mensajería:</strong> Notificación instantánea cuando llega un nuevo mensaje</p>
                <p>• <strong>Facturas:</strong> Alertas de aprobación o rechazo de facturas</p>
                <p>• <strong>Órdenes de Compra:</strong> Notificaciones de nuevas órdenes</p>
                <p>• <strong>Documentos:</strong> Alertas de validación o vencimiento</p>
                <p>• <strong>Pagos:</strong> Confirmaciones de pagos procesados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}