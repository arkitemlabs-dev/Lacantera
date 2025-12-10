// src/lib/database/sqlserver-extended.ts
// Funciones extendidas para las nuevas tablas del portal

import sql from 'mssql';
import { getConnection } from '@/lib/sql-connection';

// ============================================================================
// TIPOS
// ============================================================================

export interface UsuarioExtension {
  idUsuario: number;
  rfc?: string;
  razonSocial?: string;
  telefono?: string;
  direccionCalle?: string;
  direccionCiudad?: string;
  direccionEstado?: string;
  direccionCP?: string;
  avatarURL?: string;
  emailVerified: boolean;
}

export interface UsuarioEmpresa {
  id: number;
  idUsuario: number;
  empresa: string;
  rol: string;
  activo: boolean;
  proveedorID?: string;
  documentosValidados: boolean;
  fechaUltimaActividad?: Date;
  configuracionesJSON?: string;
}

export interface DocumentoProveedor {
  id: string;
  documentoID: string;
  proveedor: string;
  idUsuario: number;
  empresa: string;
  tipoDocumento: string;
  nombreArchivo: string;
  archivoURL: string;
  archivoTipo: string;
  archivoTamanio: number;
  estatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO' | 'POR_VENCER';
  comentarios?: string;
  fechaVencimiento?: Date;
  revisadoPor?: number;
  revisadoPorNombre?: string;
  fechaRevision?: Date;
  fechaSubida: Date;
}

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requeridoPara?: string; // JSON
  vigenciaDias?: number;
  ordenPresentacion: number;
  activo: boolean;
}

export interface Notificacion {
  id: string;
  notificacionID: string;
  idUsuario: number;
  usuarioNombre: string;
  empresa: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link?: string;
  datosJSON?: string;
  leida: boolean;
  fechaLectura?: Date;
  emailEnviado: boolean;
  fechaEnvioEmail?: Date;
  prioridad: 'normal' | 'alta' | 'critica';
  createdAt: Date;
}

export interface Conversacion {
  id: string;
  conversacionID: string;
  empresa: string;
  participantesJSON: string;
  asunto: string;
  ultimoMensaje?: string;
  ultimoMensajeFecha?: Date;
  ultimoMensajeRemitente?: number;
  ultimoMensajeRemitenteNombre?: string;
  activa: boolean;
  noLeidosJSON?: string;
}

export interface Mensaje {
  id: string;
  mensajeID: string;
  conversacionID: string;
  remitenteID: number;
  remitenteNombre: string;
  remitenteRol: string;
  destinatarioID: number;
  destinatarioNombre: string;
  mensaje: string;
  asunto?: string;
  archivosJSON?: string;
  leido: boolean;
  fechaLectura?: Date;
  createdAt: Date;
}

// ============================================================================
// EXTENSIONES DE USUARIO
// ============================================================================

export class ExtendedDatabase {
  /**
   * Obtener extensión de usuario
   */
  async getUsuarioExtension(idUsuario: number): Promise<UsuarioExtension | null> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT
          IDUsuario as idUsuario,
          RFC as rfc,
          RazonSocial as razonSocial,
          Telefono as telefono,
          DireccionCalle as direccionCalle,
          DireccionCiudad as direccionCiudad,
          DireccionEstado as direccionEstado,
          DireccionCP as direccionCP,
          AvatarURL as avatarURL,
          EmailVerified as emailVerified
        FROM pNetUsuarioExtension
        WHERE IDUsuario = @idUsuario
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0];
  }

  /**
   * Crear o actualizar extensión de usuario
   */
  async upsertUsuarioExtension(data: UsuarioExtension): Promise<void> {
    const pool = await getConnection();

    await pool
      .request()
      .input('idUsuario', sql.Int, data.idUsuario)
      .input('rfc', sql.VarChar(13), data.rfc)
      .input('razonSocial', sql.NVarChar(255), data.razonSocial)
      .input('telefono', sql.VarChar(20), data.telefono)
      .input('direccionCalle', sql.NVarChar(255), data.direccionCalle)
      .input('direccionCiudad', sql.NVarChar(100), data.direccionCiudad)
      .input('direccionEstado', sql.NVarChar(100), data.direccionEstado)
      .input('direccionCP', sql.VarChar(10), data.direccionCP)
      .input('avatarURL', sql.VarChar(500), data.avatarURL)
      .input('emailVerified', sql.Bit, data.emailVerified)
      .query(`
        IF EXISTS (SELECT 1 FROM pNetUsuarioExtension WHERE IDUsuario = @idUsuario)
        BEGIN
          UPDATE pNetUsuarioExtension
          SET
            RFC = @rfc,
            RazonSocial = @razonSocial,
            Telefono = @telefono,
            DireccionCalle = @direccionCalle,
            DireccionCiudad = @direccionCiudad,
            DireccionEstado = @direccionEstado,
            DireccionCP = @direccionCP,
            AvatarURL = @avatarURL,
            EmailVerified = @emailVerified,
            UpdatedAt = GETDATE()
          WHERE IDUsuario = @idUsuario
        END
        ELSE
        BEGIN
          INSERT INTO pNetUsuarioExtension (
            IDUsuario, RFC, RazonSocial, Telefono,
            DireccionCalle, DireccionCiudad, DireccionEstado, DireccionCP,
            AvatarURL, EmailVerified
          )
          VALUES (
            @idUsuario, @rfc, @razonSocial, @telefono,
            @direccionCalle, @direccionCiudad, @direccionEstado, @direccionCP,
            @avatarURL, @emailVerified
          )
        END
      `);
  }

  // ============================================================================
  // MULTI-EMPRESA
  // ============================================================================

  /**
   * Obtener empresas de un usuario
   */
  async getEmpresasByUsuario(idUsuario: number): Promise<UsuarioEmpresa[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT
          ue.ID as id,
          ue.IDUsuario as idUsuario,
          ue.Empresa as empresa,
          ue.Rol as rol,
          ue.Activo as activo,
          ue.ProveedorID as proveedorID,
          ue.DocumentosValidados as documentosValidados,
          ue.FechaUltimaActividad as fechaUltimaActividad,
          ue.ConfiguracionesJSON as configuracionesJSON,
          e.Nombre as empresaNombre
        FROM pNetUsuarioEmpresa ue
        INNER JOIN Empresa e ON ue.Empresa = e.Empresa
        WHERE ue.IDUsuario = @idUsuario AND ue.Activo = 1
        ORDER BY ue.FechaAsignacion DESC
      `);

    return result.recordset;
  }

  /**
   * Asignar usuario a empresa
   */
  async asignarUsuarioEmpresa(data: Omit<UsuarioEmpresa, 'id'>): Promise<number> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('idUsuario', sql.Int, data.idUsuario)
      .input('empresa', sql.VarChar(10), data.empresa)
      .input('rol', sql.VarChar(50), data.rol)
      .input('activo', sql.Bit, data.activo)
      .input('proveedorID', sql.VarChar(50), data.proveedorID)
      .input('documentosValidados', sql.Bit, data.documentosValidados)
      .input('configuracionesJSON', sql.NVarChar(sql.MAX), data.configuracionesJSON)
      .query(`
        INSERT INTO pNetUsuarioEmpresa (
          IDUsuario, Empresa, Rol, Activo, ProveedorID,
          DocumentosValidados, ConfiguracionesJSON
        )
        OUTPUT INSERTED.ID
        VALUES (
          @idUsuario, @empresa, @rol, @activo, @proveedorID,
          @documentosValidados, @configuracionesJSON
        )
      `);

    return result.recordset[0].ID;
  }

  // ============================================================================
  // DOCUMENTOS DE PROVEEDORES
  // ============================================================================

  /**
   * Obtener documentos de un proveedor
   */
  async getDocumentosProveedor(
    proveedor: string,
    empresa: string
  ): Promise<DocumentoProveedor[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('proveedor', sql.VarChar(50), proveedor)
      .input('empresa', sql.VarChar(10), empresa)
      .query(`
        SELECT
          d.ID as id,
          d.DocumentoID as documentoID,
          d.Proveedor as proveedor,
          d.IDUsuario as idUsuario,
          d.Empresa as empresa,
          d.TipoDocumento as tipoDocumento,
          d.NombreArchivo as nombreArchivo,
          d.ArchivoURL as archivoURL,
          d.ArchivoTipo as archivoTipo,
          d.ArchivoTamanio as archivoTamanio,
          d.Estatus as estatus,
          d.Comentarios as comentarios,
          d.FechaVencimiento as fechaVencimiento,
          d.RevisadoPor as revisadoPor,
          d.RevisadoPorNombre as revisadoPorNombre,
          d.FechaRevision as fechaRevision,
          d.FechaSubida as fechaSubida,
          td.Nombre as tipoDocumentoNombre,
          td.VigenciaDias as vigenciaDias
        FROM ProvDocumentos d
        INNER JOIN ProvTiposDocumento td ON d.TipoDocumento = td.Codigo
        WHERE d.Proveedor = @proveedor AND d.Empresa = @empresa
        ORDER BY td.OrdenPresentacion, d.FechaSubida DESC
      `);

    return result.recordset;
  }

  /**
   * Crear documento de proveedor
   */
  async createDocumentoProveedor(
    data: Omit<DocumentoProveedor, 'id' | 'fechaSubida'>
  ): Promise<string> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('documentoID', sql.VarChar(100), data.documentoID)
      .input('proveedor', sql.VarChar(50), data.proveedor)
      .input('idUsuario', sql.Int, data.idUsuario)
      .input('empresa', sql.VarChar(10), data.empresa)
      .input('tipoDocumento', sql.VarChar(50), data.tipoDocumento)
      .input('nombreArchivo', sql.NVarChar(255), data.nombreArchivo)
      .input('archivoURL', sql.VarChar(500), data.archivoURL)
      .input('archivoTipo', sql.VarChar(100), data.archivoTipo)
      .input('archivoTamanio', sql.BigInt, data.archivoTamanio)
      .input('estatus', sql.VarChar(50), data.estatus)
      .input('fechaVencimiento', sql.Date, data.fechaVencimiento)
      .query(`
        INSERT INTO ProvDocumentos (
          DocumentoID, Proveedor, IDUsuario, Empresa, TipoDocumento,
          NombreArchivo, ArchivoURL, ArchivoTipo, ArchivoTamanio,
          Estatus, FechaVencimiento
        )
        OUTPUT INSERTED.ID
        VALUES (
          @documentoID, @proveedor, @idUsuario, @empresa, @tipoDocumento,
          @nombreArchivo, @archivoURL, @archivoTipo, @archivoTamanio,
          @estatus, @fechaVencimiento
        )
      `);

    return result.recordset[0].ID;
  }

  /**
   * Actualizar estatus de documento
   */
  async updateDocumentoEstatus(
    documentoID: string,
    estatus: string,
    revisadoPor: number,
    revisadoPorNombre: string,
    comentarios?: string
  ): Promise<void> {
    const pool = await getConnection();

    await pool
      .request()
      .input('documentoID', sql.VarChar(100), documentoID)
      .input('estatus', sql.VarChar(50), estatus)
      .input('revisadoPor', sql.Int, revisadoPor)
      .input('revisadoPorNombre', sql.NVarChar(255), revisadoPorNombre)
      .input('comentarios', sql.NVarChar(1000), comentarios)
      .query(`
        UPDATE ProvDocumentos
        SET
          Estatus = @estatus,
          RevisadoPor = @revisadoPor,
          RevisadoPorNombre = @revisadoPorNombre,
          FechaRevision = GETDATE(),
          Comentarios = @comentarios,
          UpdatedAt = GETDATE()
        WHERE DocumentoID = @documentoID
      `);
  }

  /**
   * Obtener tipos de documentos
   */
  async getTiposDocumento(activo = true): Promise<TipoDocumento[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('activo', sql.Bit, activo)
      .query(`
        SELECT
          ID as id,
          Codigo as codigo,
          Nombre as nombre,
          Descripcion as descripcion,
          RequeridoPara as requeridoPara,
          VigenciaDias as vigenciaDias,
          OrdenPresentacion as ordenPresentacion,
          Activo as activo
        FROM ProvTiposDocumento
        WHERE Activo = @activo
        ORDER BY OrdenPresentacion
      `);

    return result.recordset;
  }

  /**
   * Obtener documentos próximos a vencer
   */
  async getDocumentosPorVencer(dias: number, empresa: string): Promise<DocumentoProveedor[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('dias', sql.Int, dias)
      .input('empresa', sql.VarChar(10), empresa)
      .query(`
        SELECT
          d.ID as id,
          d.DocumentoID as documentoID,
          d.Proveedor as proveedor,
          d.IDUsuario as idUsuario,
          d.Empresa as empresa,
          d.TipoDocumento as tipoDocumento,
          d.NombreArchivo as nombreArchivo,
          d.ArchivoURL as archivoURL,
          d.Estatus as estatus,
          d.FechaVencimiento as fechaVencimiento,
          td.Nombre as tipoDocumentoNombre,
          p.Nombre as proveedorNombre,
          u.eMail as proveedorEmail
        FROM ProvDocumentos d
        INNER JOIN ProvTiposDocumento td ON d.TipoDocumento = td.Codigo
        INNER JOIN Prov p ON d.Proveedor = p.Proveedor
        INNER JOIN pNetUsuario u ON d.IDUsuario = u.IDUsuario
        WHERE d.Empresa = @empresa
          AND d.Estatus = 'APROBADO'
          AND d.FechaVencimiento IS NOT NULL
          AND d.FechaVencimiento BETWEEN GETDATE() AND DATEADD(day, @dias, GETDATE())
        ORDER BY d.FechaVencimiento ASC
      `);

    return result.recordset;
  }

  // ============================================================================
  // NOTIFICACIONES
  // ============================================================================

  /**
   * Crear notificación
   */
  async createNotificacion(data: Omit<Notificacion, 'id' | 'createdAt'>): Promise<string> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('notificacionID', sql.VarChar(100), data.notificacionID)
      .input('usuario', sql.VarChar(10), String(data.idUsuario))
      .input('usuarioNombre', sql.NVarChar(255), data.usuarioNombre)
      .input('empresa', sql.VarChar(10), data.empresa)
      .input('tipo', sql.VarChar(50), data.tipo)
      .input('titulo', sql.NVarChar(255), data.titulo)
      .input('mensaje', sql.NVarChar(1000), data.mensaje)
      .input('link', sql.VarChar(500), data.link)
      .input('datosJSON', sql.NVarChar(sql.MAX), data.datosJSON)
      .input('prioridad', sql.VarChar(20), data.prioridad)
      .query(`
        INSERT INTO pNetNotificaciones (
          NotificacionID, Usuario, UsuarioNombre, Empresa, Tipo,
          Titulo, Mensaje, Link, DatosJSON, Prioridad
        )
        OUTPUT INSERTED.ID
        VALUES (
          @notificacionID, @usuario, @usuarioNombre, @empresa, @tipo,
          @titulo, @mensaje, @link, @datosJSON, @prioridad
        )
      `);

    return result.recordset[0].ID;
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async getNotificacionesUsuario(
    idUsuario: number,
    empresa: string,
    limit = 50
  ): Promise<Notificacion[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('usuario', sql.VarChar(10), String(idUsuario))
      .input('empresa', sql.VarChar(10), empresa)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          ID as id,
          NotificacionID as notificacionID,
          Usuario as idUsuario,
          UsuarioNombre as usuarioNombre,
          Empresa as empresa,
          Tipo as tipo,
          Titulo as titulo,
          Mensaje as mensaje,
          Link as link,
          DatosJSON as datosJSON,
          Leida as leida,
          FechaLectura as fechaLectura,
          EmailEnviado as emailEnviado,
          FechaEnvioEmail as fechaEnvioEmail,
          Prioridad as prioridad,
          CreatedAt as createdAt
        FROM pNetNotificaciones
        WHERE Usuario = @usuario AND Empresa = @empresa
        ORDER BY Prioridad DESC, CreatedAt DESC
      `);

    return result.recordset;
  }

  /**
   * Marcar notificación como leída
   */
  async marcarNotificacionLeida(notificacionID: string): Promise<void> {
    const pool = await getConnection();

    await pool
      .request()
      .input('notificacionID', sql.VarChar(100), notificacionID)
      .query(`
        UPDATE pNetNotificaciones
        SET Leida = 1, FechaLectura = GETDATE()
        WHERE NotificacionID = @notificacionID
      `);
  }

  /**
   * Contar notificaciones no leídas
   */
  async contarNotificacionesNoLeidas(idUsuario: number, empresa: string): Promise<number> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('usuario', sql.VarChar(10), String(idUsuario))
      .input('empresa', sql.VarChar(10), empresa)
      .query(`
        SELECT COUNT(*) as count
        FROM pNetNotificaciones
        WHERE Usuario = @usuario AND Empresa = @empresa AND Leida = 0
      `);

    return result.recordset[0].count;
  }

  // ============================================================================
  // MENSAJERÍA
  // ============================================================================

  /**
   * Crear conversación
   */
  async createConversacion(data: Omit<Conversacion, 'id'>): Promise<string> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('conversacionID', sql.VarChar(100), data.conversacionID)
      .input('empresa', sql.VarChar(10), data.empresa)
      .input('participantesJSON', sql.NVarChar(sql.MAX), data.participantesJSON)
      .input('asunto', sql.NVarChar(500), data.asunto)
      .query(`
        INSERT INTO pNetConversaciones (
          ConversacionID, Empresa, ParticipantesJSON, Asunto, Activa
        )
        OUTPUT INSERTED.ID
        VALUES (
          @conversacionID, @empresa, @participantesJSON, @asunto, 1
        )
      `);

    return result.recordset[0].ID;
  }

  /**
   * Crear mensaje
   */
  async createMensaje(data: Omit<Mensaje, 'id' | 'createdAt'>): Promise<string> {
    const pool = await getConnection();

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Insertar mensaje
      const result = await transaction
        .request()
        .input('mensajeID', sql.VarChar(100), data.mensajeID)
        .input('conversacionID', sql.UniqueIdentifier, data.conversacionID)
        .input('remitenteID', sql.Int, data.remitenteID)
        .input('remitenteNombre', sql.NVarChar(255), data.remitenteNombre)
        .input('remitenteRol', sql.VarChar(50), data.remitenteRol)
        .input('destinatarioID', sql.Int, data.destinatarioID)
        .input('destinatarioNombre', sql.NVarChar(255), data.destinatarioNombre)
        .input('mensaje', sql.NVarChar(sql.MAX), data.mensaje)
        .input('asunto', sql.NVarChar(500), data.asunto)
        .input('archivosJSON', sql.NVarChar(sql.MAX), data.archivosJSON)
        .query(`
          INSERT INTO pNetMensajes (
            MensajeID, ConversacionID, RemitenteID, RemitenteNombre, RemitenteRol,
            DestinatarioID, DestinatarioNombre, Mensaje, Asunto, ArchivosJSON
          )
          OUTPUT INSERTED.ID
          VALUES (
            @mensajeID, @conversacionID, @remitenteID, @remitenteNombre, @remitenteRol,
            @destinatarioID, @destinatarioNombre, @mensaje, @asunto, @archivosJSON
          )
        `);

      // Actualizar conversación
      await transaction
        .request()
        .input('conversacionID', sql.UniqueIdentifier, data.conversacionID)
        .input('ultimoMensaje', sql.NVarChar(1000), data.mensaje.substring(0, 1000))
        .input('remitenteID', sql.Int, data.remitenteID)
        .input('remitenteNombre', sql.NVarChar(255), data.remitenteNombre)
        .query(`
          UPDATE pNetConversaciones
          SET
            UltimoMensaje = @ultimoMensaje,
            UltimoMensajeFecha = GETDATE(),
            UltimoMensajeRemitente = @remitenteID,
            UltimoMensajeRemitenteNombre = @remitenteNombre,
            UpdatedAt = GETDATE()
          WHERE ID = @conversacionID
        `);

      await transaction.commit();
      return result.recordset[0].ID;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtener conversaciones de un usuario
   */
  async getConversacionesUsuario(
    idUsuario: number,
    empresa: string
  ): Promise<Conversacion[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('empresa', sql.VarChar(10), empresa)
      .query(`
        SELECT
          ID as id,
          ConversacionID as conversacionID,
          Empresa as empresa,
          ParticipantesJSON as participantesJSON,
          Asunto as asunto,
          UltimoMensaje as ultimoMensaje,
          UltimoMensajeFecha as ultimoMensajeFecha,
          UltimoMensajeRemitente as ultimoMensajeRemitente,
          UltimoMensajeRemitenteNombre as ultimoMensajeRemitenteNombre,
          Activa as activa,
          NoLeidosJSON as noLeidosJSON
        FROM pNetConversaciones
        WHERE Empresa = @empresa
          AND Activa = 1
          AND ParticipantesJSON LIKE '%' + CAST(@idUsuario AS VARCHAR) + '%'
        ORDER BY UltimoMensajeFecha DESC
      `);

    return result.recordset;
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMensajesConversacion(conversacionID: string): Promise<Mensaje[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('conversacionID', sql.UniqueIdentifier, conversacionID)
      .query(`
        SELECT
          ID as id,
          MensajeID as mensajeID,
          ConversacionID as conversacionID,
          RemitenteID as remitenteID,
          RemitenteNombre as remitenteNombre,
          RemitenteRol as remitenteRol,
          DestinatarioID as destinatarioID,
          DestinatarioNombre as destinatarioNombre,
          Mensaje as mensaje,
          Asunto as asunto,
          ArchivosJSON as archivosJSON,
          Leido as leido,
          FechaLectura as fechaLectura,
          CreatedAt as createdAt
        FROM pNetMensajes
        WHERE ConversacionID = @conversacionID
        ORDER BY CreatedAt ASC
      `);

    return result.recordset;
  }

  /**
   * Marcar mensaje como leído
   */
  async marcarMensajeLeido(mensajeID: string): Promise<void> {
    const pool = await getConnection();

    await pool
      .request()
      .input('mensajeID', sql.VarChar(100), mensajeID)
      .query(`
        UPDATE pNetMensajes
        SET Leido = 1, FechaLectura = GETDATE()
        WHERE MensajeID = @mensajeID
      `);
  }

  // ============================================================================
  // AUDITORÍA
  // ============================================================================

  /**
   * Crear registro de auditoría
   */
  async createAuditLog(data: {
    idUsuario: number;
    usuarioNombre: string;
    empresa?: string;
    accion: string;
    tablaAfectada: string;
    registroID: string;
    valoresAnterioresJSON?: string;
    valoresNuevosJSON?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('idUsuario', sql.Int, data.idUsuario)
      .input('usuarioNombre', sql.NVarChar(255), data.usuarioNombre)
      .input('empresa', sql.VarChar(10), data.empresa)
      .input('accion', sql.VarChar(100), data.accion)
      .input('tablaAfectada', sql.VarChar(100), data.tablaAfectada)
      .input('registroID', sql.VarChar(100), data.registroID)
      .input('valoresAnterioresJSON', sql.NVarChar(sql.MAX), data.valoresAnterioresJSON)
      .input('valoresNuevosJSON', sql.NVarChar(sql.MAX), data.valoresNuevosJSON)
      .input('ipAddress', sql.VarChar(45), data.ipAddress)
      .input('userAgent', sql.VarChar(500), data.userAgent)
      .query(`
        INSERT INTO pNetAuditLog (
          IDUsuario, UsuarioNombre, Empresa, Accion, TablaAfectada,
          RegistroID, ValoresAnterioresJSON, ValoresNuevosJSON,
          IPAddress, UserAgent
        )
        OUTPUT INSERTED.ID
        VALUES (
          @idUsuario, @usuarioNombre, @empresa, @accion, @tablaAfectada,
          @registroID, @valoresAnterioresJSON, @valoresNuevosJSON,
          @ipAddress, @userAgent
        )
      `);

    return result.recordset[0].ID;
  }

  /**
   * Obtener logs de auditoría por tabla
   */
  async getAuditLogByTabla(tabla: string, registroID?: string, limit = 100): Promise<any[]> {
    const pool = await getConnection();

    const request = pool
      .request()
      .input('tabla', sql.VarChar(100), tabla)
      .input('limit', sql.Int, limit);

    let query = `
      SELECT TOP (@limit)
        ID as id,
        IDUsuario as idUsuario,
        UsuarioNombre as usuarioNombre,
        Empresa as empresa,
        Accion as accion,
        TablaAfectada as tablaAfectada,
        RegistroID as registroID,
        ValoresAnterioresJSON as valoresAnterioresJSON,
        ValoresNuevosJSON as valoresNuevosJSON,
        IPAddress as ipAddress,
        UserAgent as userAgent,
        CreatedAt as createdAt
      FROM pNetAuditLog
      WHERE TablaAfectada = @tabla
    `;

    if (registroID) {
      request.input('registroID', sql.VarChar(100), registroID);
      query += ' AND RegistroID = @registroID';
    }

    query += ' ORDER BY CreatedAt DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  // ============================================================================
  // CATÁLOGOS
  // ============================================================================

  /**
   * Obtener todas las categorías de proveedores
   */
  async getAllProveedorCategorias(): Promise<any[]> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .query(`
        SELECT
          ID as id,
          Codigo as codigo,
          Nombre as nombre,
          Descripcion as descripcion,
          DocumentosRequeridosJSON as documentosRequeridosJSON,
          Activo as activo
        FROM ProvCategoria
        WHERE Activo = 1
        ORDER BY Nombre
      `);

    return result.recordset;
  }

  /**
   * Obtener todos los tipos de documentos (alias para compatibilidad)
   */
  async getAllTiposDocumento(categoria?: string): Promise<TipoDocumento[]> {
    return this.getTiposDocumento(true);
  }
}

// Instancia singleton
export const extendedDb = new ExtendedDatabase();
