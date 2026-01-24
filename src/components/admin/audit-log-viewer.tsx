'use client';

import { useEffect, useState } from 'react';
import { Shield, Clock, User, Database } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AuditLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogViewerProps {
  tabla: string;
  registroID?: string;
}

// Definir el tipo de las acciones válidas
type AccionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'APPROVE' | 'REJECT';

const accionConfig: Record<AccionType, { label: string; className: string }> = {
  CREATE: {
    label: 'Creado',
    className: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  },
  UPDATE: {
    label: 'Actualizado',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
  },
  DELETE: {
    label: 'Eliminado',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  },
  READ: {
    label: 'Consultado',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200',
  },
  APPROVE: {
    label: 'Aprobado',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  },
  REJECT: {
    label: 'Rechazado',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
  },
};

export function AuditLogViewer({ tabla, registroID }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [tabla, registroID]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ tabla });
      if (registroID) params.append('registroID', registroID);

      const response = await fetch(`/api/auditoria?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar logs');
      }

      const data = await response.json();
      setLogs(data.logs);
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
            Cargando historial de auditoría...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay registros de auditoría
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
          <Shield className="h-5 w-5" />
          Historial de Auditoría
        </CardTitle>
        <CardDescription>
          {logs.length} registro(s) de auditoría para {tabla}
          {registroID && ` - ID: ${registroID}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="text-right">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              // Obtener el ID del log de forma segura
              const logId = log.id || `log-${Math.random()}`;
              const isExpanded = expandedLog === logId;

              // Obtener la configuración de la acción de forma segura
              const accion = log.accion as AccionType;
              const actionConfig = accionConfig[accion] || {
                label: log.accion || 'Desconocido',
                className: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200'
              };

              return (
                <>
                  <TableRow
                    key={logId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedLog(isExpanded ? null : logId)
                    }
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={actionConfig.className}
                      >
                        {actionConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.usuarioNombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.usuario}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.ipAddress || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {isExpanded ? 'Ocultar' : 'Ver más'}
                      </span>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${logId}-details`}>
                      <TableCell colSpan={5} className="bg-muted/30">
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium mb-1">Tabla Afectada</p>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                <span>{log.tablaAfectada}</span>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium mb-1">Registro ID</p>
                              <span className="font-mono">
                                {log.registroID}
                              </span>
                            </div>
                            {log.empresa && (
                              <div>
                                <p className="font-medium mb-1">Empresa</p>
                                <span>{log.empresa}</span>
                              </div>
                            )}
                            {log.userAgent && (
                              <div>
                                <p className="font-medium mb-1">User Agent</p>
                                <span className="text-xs text-muted-foreground truncate">
                                  {log.userAgent}
                                </span>
                              </div>
                            )}
                          </div>

                          {log.valoresAnterioresJSON && (
                            <div>
                              <p className="font-medium mb-2">
                                Valores Anteriores
                              </p>
                              <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto">
                                {JSON.stringify(
                                  JSON.parse(log.valoresAnterioresJSON),
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}

                          {log.valoresNuevosJSON && (
                            <div>
                              <p className="font-medium mb-2">Valores Nuevos</p>
                              <pre className="bg-background p-3 rounded-md text-xs overflow-x-auto">
                                {JSON.stringify(
                                  JSON.parse(log.valoresNuevosJSON),
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}