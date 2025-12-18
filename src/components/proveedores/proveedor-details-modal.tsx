'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Phone, Mail, CreditCard, Building, FileText } from 'lucide-react';

interface ProveedorDetailsModalProps {
  proveedor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProveedorDetailsModal({ proveedor, open, onOpenChange }: ProveedorDetailsModalProps) {
  if (!proveedor) return null;

  const { erpDatos } = proveedor;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {proveedor.razonSocial}
            {proveedor.codigoERP && (
              <Badge variant="outline" className="ml-2">
                {proveedor.codigoERP}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Información General */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">RFC:</span>
                  <span>{erpDatos?.rfc || 'No disponible'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email Principal:</span>
                  <span>{erpDatos?.email1 || proveedor.email || 'No disponible'}</span>
                </div>
                {erpDatos?.email2 && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email Secundario:</span>
                    <span>{erpDatos.email2}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Teléfono:</span>
                  <span>{erpDatos?.telefono || proveedor.telefono || 'No disponible'}</span>
                </div>
              </div>
              <div className="space-y-2">
                {erpDatos?.contacto1 && (
                  <div>
                    <span className="font-medium">Contacto Principal:</span>
                    <span className="ml-2">{erpDatos.contacto1}</span>
                  </div>
                )}
                {erpDatos?.categoria && (
                  <div>
                    <span className="font-medium">Categoría:</span>
                    <Badge variant="secondary" className="ml-2">{erpDatos.categoria}</Badge>
                  </div>
                )}
                <div>
                  <span className="font-medium">Estado:</span>
                  <Badge 
                    variant={erpDatos?.estatus?.toLowerCase() === 'alta' ? 'default' : 'destructive'}
                    className="ml-2"
                  >
                    {erpDatos?.estatus || 'No disponible'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t my-4" />

          {/* Dirección */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              {erpDatos?.direccion ? (
                <div className="space-y-1">
                  <div>{erpDatos.direccion}</div>
                  {erpDatos.colonia && <div>Col. {erpDatos.colonia}</div>}
                  <div>
                    {erpDatos.ciudad && `${erpDatos.ciudad}, `}
                    {erpDatos.estado && `${erpDatos.estado} `}
                    {erpDatos.codigoPostal && `C.P. ${erpDatos.codigoPostal}`}
                  </div>
                  {erpDatos.pais && <div>{erpDatos.pais}</div>}
                </div>
              ) : (
                <span className="text-muted-foreground">Dirección no disponible</span>
              )}
            </div>
          </div>

          <div className="border-t my-4" />

          {/* Información Comercial */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Información Comercial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {erpDatos?.condicionPago && (
                  <div>
                    <span className="font-medium">Condición de Pago:</span>
                    <span className="ml-2">{erpDatos.condicionPago}</span>
                  </div>
                )}
                {erpDatos?.formaPago && (
                  <div>
                    <span className="font-medium">Forma de Pago:</span>
                    <span className="ml-2">{erpDatos.formaPago}</span>
                  </div>
                )}
                {erpDatos?.moneda && (
                  <div>
                    <span className="font-medium">Moneda:</span>
                    <span className="ml-2">{erpDatos.moneda}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {erpDatos?.descuento && (
                  <div>
                    <span className="font-medium">Descuento:</span>
                    <span className="ml-2">{erpDatos.descuento}%</span>
                  </div>
                )}
                {erpDatos?.comprador && (
                  <div>
                    <span className="font-medium">Comprador:</span>
                    <span className="ml-2">{erpDatos.comprador}</span>
                  </div>
                )}
                {erpDatos?.agente && (
                  <div>
                    <span className="font-medium">Agente:</span>
                    <span className="ml-2">{erpDatos.agente}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t my-4" />

          {/* Información Bancaria */}
          {(erpDatos?.banco || erpDatos?.cuenta) && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Información Bancaria
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  {erpDatos.banco && (
                    <div>
                      <span className="font-medium">Banco:</span>
                      <span className="ml-2">{erpDatos.banco}</span>
                    </div>
                  )}
                  {erpDatos.cuenta && (
                    <div>
                      <span className="font-medium">Cuenta:</span>
                      <span className="ml-2">{erpDatos.cuenta}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t my-4" />
            </>
          )}

          {/* Días de Revisión y Pago */}
          {(erpDatos?.diasRevision?.length > 0 || erpDatos?.diasPago?.length > 0) && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Horarios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {erpDatos.diasRevision?.length > 0 && (
                    <div>
                      <span className="font-medium">Días de Revisión:</span>
                      <div className="flex gap-1 mt-1">
                        {erpDatos.diasRevision.map((dia: string, index: number) => (
                          <Badge key={index} variant="outline">{dia}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {erpDatos.diasPago?.length > 0 && (
                    <div>
                      <span className="font-medium">Días de Pago:</span>
                      <div className="flex gap-1 mt-1">
                        {erpDatos.diasPago.map((dia: string, index: number) => (
                          <Badge key={index} variant="outline">{dia}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t my-4" />
            </>
          )}

          {/* Situación */}
          {erpDatos?.situacion && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Situación Actual</h3>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div>
                  <span className="font-medium">Estado:</span>
                  <Badge variant="outline" className="ml-2">{erpDatos.situacion}</Badge>
                </div>
                {erpDatos.situacionNota && (
                  <div>
                    <span className="font-medium">Nota:</span>
                    <p className="mt-1 text-sm">{erpDatos.situacionNota}</p>
                  </div>
                )}
                {erpDatos.situacionFecha && (
                  <div>
                    <span className="font-medium">Fecha:</span>
                    <span className="ml-2">{new Date(erpDatos.situacionFecha).toLocaleDateString('es-MX')}</span>
                  </div>
                )}
                {erpDatos.situacionUsuario && (
                  <div>
                    <span className="font-medium">Usuario:</span>
                    <span className="ml-2">{erpDatos.situacionUsuario}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fechas */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Fechas Importantes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {erpDatos?.alta && (
                <div>
                  <span className="font-medium">Fecha de Alta ERP:</span>
                  <span className="ml-2">{new Date(erpDatos.alta).toLocaleDateString('es-MX')}</span>
                </div>
              )}
              {erpDatos?.ultimoCambio && (
                <div>
                  <span className="font-medium">Último Cambio:</span>
                  <span className="ml-2">{new Date(erpDatos.ultimoCambio).toLocaleDateString('es-MX')}</span>
                </div>
              )}
              {proveedor.fechaRegistroPortal && (
                <div>
                  <span className="font-medium">Registro en Portal:</span>
                  <span className="ml-2">{new Date(proveedor.fechaRegistroPortal).toLocaleDateString('es-MX')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Empresas Asignadas */}
          {proveedor.empresasAsignadas?.length > 0 && (
            <>
              <div className="border-t my-4" />
              <div>
                <h3 className="text-lg font-semibold mb-3">Empresas Asignadas</h3>
                <div className="space-y-2">
                  {proveedor.empresasAsignadas.map((empresa: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium">{empresa.empresaName}</div>
                        <div className="text-sm text-muted-foreground">
                          Código ERP: {empresa.erpProveedorCode}
                        </div>
                      </div>
                      <Badge variant={empresa.mappingActivo ? 'default' : 'secondary'}>
                        {empresa.mappingActivo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}