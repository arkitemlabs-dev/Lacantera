import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';

export default function ConfiguracionPage() {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <Tabs defaultValue="general">
        <div className="mx-auto grid w-full max-w-6xl gap-2">
          <h1 className="text-3xl font-semibold">Configuración</h1>
          <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 border-b rounded-none">
            <TabsTrigger value="general" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Configuración general
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Usuarios y Roles
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Seguridad y acceso
            </TabsTrigger>
            <TabsTrigger value="providers" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              Gestión de proveedores
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="mx-auto w-full max-w-6xl mt-6">
          <TabsContent value="general">
            <div className="grid gap-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Company Information */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Información de la Empresa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                        <Input id="companyName" defaultValue="Global Mining Solutions" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rfc">RFC / NIT *</Label>
                        <Input id="rfc" defaultValue="GMS850101ABC" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fiscalAddress">Dirección Fiscal</Label>
                        <Input id="fiscalAddress" placeholder="Calle, Número, Colonia, CP, Ciudad, Estado" />
                      </div>
                      <div className="space-y-2">
                        <Label>Logo de la Empresa</Label>
                        <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-40">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Arrastra tu logo aquí o haz clic para seleccionar
                          </p>
                          <p className="text-xs text-muted-foreground">Formatos: PNG, JPG - Máx: 2MB</p>
                          <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {/* System Preferences */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Preferencias del Sistema</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="language">Idioma</Label>
                        <Select defaultValue="es">
                          <SelectTrigger id="language">
                            <SelectValue placeholder="Seleccionar idioma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="en">Inglés</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Zona Horaria</Label>
                        <Select defaultValue="gmt-6">
                          <SelectTrigger id="timezone">
                            <SelectValue placeholder="Seleccionar zona horaria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gmt-6">América/Ciudad de México (GMT-6)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Moneda Predeterminada</Label>
                        <Select defaultValue="mxn">
                          <SelectTrigger id="currency">
                            <SelectValue placeholder="Seleccionar moneda" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mxn">MXN - Peso Mexicano</SelectItem>
                            <SelectItem value="usd">USD - Dólar Americano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Formato de Fecha</Label>
                        <Select defaultValue="ddmmyyyy">
                          <SelectTrigger id="dateFormat">
                            <SelectValue placeholder="Seleccionar formato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ddmmyyyy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="mmddyyyy">MM/DD/YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numberFormat">Formato de Números</Label>
                        <Select defaultValue="comma">
                          <SelectTrigger id="numberFormat">
                            <SelectValue placeholder="Seleccionar formato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="comma">1,234.56 (Coma para miles)</SelectItem>
                             <SelectItem value="dot">1.234,56 (Punto para miles)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* Terms and Policies */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Términos y Políticas</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <Label htmlFor="terms">Términos y Condiciones Generales</Label>
                        <Textarea id="terms" placeholder="Ingrese los términos y condiciones que aplicarán a todos los proveedores..." className="min-h-32" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="privacy">Políticas de Privacidad</Label>
                        <Textarea id="privacy" placeholder="Defina las políticas de privacidad y tratamiento de datos..." className="min-h-32" />
                      </div>
                  </CardContent>
                </Card>
              </div>
            </div>
             <div className="flex justify-end mt-8">
                <Button>Guardar Configuración</Button>
            </div>
          </TabsContent>
          <TabsContent value="users">
            <Card>
                <CardHeader>
                    <CardTitle>Usuarios y Roles</CardTitle>
                    <CardDescription>Aquí podrás gestionar los usuarios y sus roles en el sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Contenido de Usuarios y Roles...</p>
                </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <Card>
                <CardHeader>
                    <CardTitle>Seguridad y acceso</CardTitle>
                    <CardDescription>Aquí podrás configurar las opciones de seguridad y acceso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Contenido de Seguridad y acceso...</p>
                </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="providers">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de proveedores</CardTitle>
                    <CardDescription>Aquí podrás configurar opciones relacionadas a los proveedores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Contenido de Gestión de proveedores...</p>
                </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
