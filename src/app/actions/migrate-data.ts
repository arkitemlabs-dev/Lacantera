'use server';

import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { database } from '@/lib/database';

const mockProveedores = [
  {
    uid: 'proveedor-1',
    email: 'contacto@acerosnorte.com',
    displayName: 'Juan Pérez',
    role: 'proveedor' as const,
    userType: 'Proveedor' as const,
    empresa: 'La Cantera Desarrollos Mineros',
    isActive: true,
    rfc: 'ANO010203XYZ',
    razonSocial: 'Aceros del Norte S.A. de C.V.',
    telefono: '555-1234-5678',
    direccion: {
      calle: 'Av. Industrial 123',
      ciudad: 'Monterrey',
      estado: 'Nuevo León',
      cp: '64000',
    },
    status: 'activo' as const,
    documentosValidados: true,
    createdAt: new Date('2023-01-15'),
  },
  {
    uid: 'proveedor-2',
    email: 'ventas@materialesabc.com',
    displayName: 'Maria Garcia',
    role: 'proveedor' as const,
    userType: 'Proveedor' as const,
    empresa: 'La Cantera Desarrollos Mineros',
    isActive: true,
    rfc: 'LEM040506ABC',
    razonSocial: 'Logística Express Mexicana',
    telefono: '555-2345-6789',
    status: 'activo' as const,
    documentosValidados: true,
    createdAt: new Date('2023-03-22'),
  },
  {
    uid: 'proveedor-3',
    email: 'info@constructorarapida.dev',
    displayName: 'Carlos López',
    role: 'proveedor' as const,
    userType: 'Proveedor' as const,
    empresa: 'La Cantera Desarrollos Mineros',
    isActive: false,
    rfc: 'CEG070809DEF',
    razonSocial: 'Componentes Electrónicos Globales',
    telefono: '555-3456-7890',
    status: 'suspendido' as const,
    documentosValidados: true,
    createdAt: new Date('2023-06-01'),
  },
];

const mockOrdenesCompra = [
  {
    ordenId: 'OC-128',
    folio: 'OC-128',
    proveedorId: 'proveedor-1',
    proveedorRFC: 'ANO010203XYZ',
    proveedorRazonSocial: 'Aceros del Norte S.A. de C.V.',
    empresaId: 'empresa-1',
    empresaRazonSocial: 'La Cantera Desarrollos Mineros',
    fecha: new Date('2024-07-20'),
    fechaEntrega: new Date('2024-07-30'),
    montoTotal: 1500.0,
    moneda: 'MXN' as const,
    conceptos: [
      {
        clave: 'MAT-001',
        descripcion: 'Material de oficina variado',
        cantidad: 50,
        unidad: 'PZA',
        precioUnitario: 30.0,
        importe: 1500.0,
      },
    ],
    status: 'pendiente_aceptacion' as const,
    facturada: false,
    observaciones: 'Entrega urgente',
    intelisisId: 'INT-OC-128',
    ultimaSincronizacion: new Date(),
    createdAt: new Date('2024-07-20'),
    updatedAt: new Date(),
    createdBy: 'Ana Lopez',
  },
  {
    ordenId: 'OC-127',
    folio: 'OC-127',
    proveedorId: 'proveedor-2',
    proveedorRFC: 'LEM040506ABC',
    proveedorRazonSocial: 'Logística Express Mexicana',
    empresaId: 'empresa-1',
    empresaRazonSocial: 'La Cantera Desarrollos Mineros',
    fecha: new Date('2024-07-18'),
    fechaEntrega: new Date('2024-07-25'),
    montoTotal: 8500.5,
    moneda: 'MXN' as const,
    conceptos: [
      {
        clave: 'SEG-001',
        descripcion: 'Equipo de seguridad industrial',
        cantidad: 100,
        unidad: 'PZA',
        precioUnitario: 85.0,
        importe: 8500.0,
      },
    ],
    status: 'aceptada' as const,
    facturada: true,
    facturaId: 'factura-2',
    intelisisId: 'INT-OC-127',
    ultimaSincronizacion: new Date(),
    createdAt: new Date('2024-07-18'),
    updatedAt: new Date(),
    createdBy: 'Carlos Vera',
  },
  {
    ordenId: 'OC-126',
    folio: 'OC-126',
    proveedorId: 'proveedor-3',
    proveedorRFC: 'CEG070809DEF',
    proveedorRazonSocial: 'Componentes Electrónicos Globales',
    empresaId: 'empresa-1',
    empresaRazonSocial: 'La Cantera Desarrollos Mineros',
    fecha: new Date('2024-07-15'),
    fechaEntrega: new Date('2024-07-22'),
    montoTotal: 25000.0,
    moneda: 'MXN' as const,
    conceptos: [
      {
        clave: 'REF-001',
        descripcion: 'Refacciones para maquinaria pesada',
        cantidad: 10,
        unidad: 'PZA',
        precioUnitario: 2500.0,
        importe: 25000.0,
      },
    ],
    status: 'completada' as const,
    facturada: false,
    intelisisId: 'INT-OC-126',
    ultimaSincronizacion: new Date(),
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date(),
    createdBy: 'Maria Garcia',
  },
];

const mockFacturas = [
  {
    facturaId: 'FACT-001',
    proveedorId: 'proveedor-1',
    proveedorRFC: 'ANO010203XYZ',
    proveedorRazonSocial: 'Aceros del Norte S.A. de C.V.',
    receptorRFC: 'LCD010101A00',
    receptorRazonSocial: 'La Cantera Desarrollos Mineros',
    empresaId: 'empresa-1',
    uuid: 'A1B2C3D4-E5F6-1234-5678-90ABCDEF0001',
    serie: 'A',
    folio: '5832',
    fecha: new Date('2024-07-19'),
    subtotal: 7327.59,
    iva: 1172.91,
    total: 8500.5,
    moneda: 'MXN' as const,
    xmlUrl: 'https://storage.example.com/facturas/FACT-001.xml',
    pdfUrl: 'https://storage.example.com/facturas/FACT-001.pdf',
    validadaSAT: true,
    estatusSAT: 'vigente' as const,
    fechaValidacionSAT: new Date('2024-07-19'),
    ordenCompraId: 'OC-127',
    status: 'pendiente_revision' as const,
    pagada: false,
    createdAt: new Date('2024-07-19'),
    updatedAt: new Date(),
    uploadedBy: 'proveedor-1',
  },
  {
    facturaId: 'FACT-002',
    proveedorId: 'proveedor-2',
    proveedorRFC: 'LEM040506ABC',
    proveedorRazonSocial: 'Logística Express Mexicana',
    receptorRFC: 'LCD010101A00',
    receptorRazonSocial: 'La Cantera Desarrollos Mineros',
    empresaId: 'empresa-1',
    uuid: 'A1B2C3D4-E5F6-1234-5678-90ABCDEF0002',
    serie: 'A',
    folio: '5831',
    fecha: new Date('2024-07-11'),
    subtotal: 2759.44,
    iva: 441.31,
    total: 3200.75,
    moneda: 'MXN' as const,
    xmlUrl: 'https://storage.example.com/facturas/FACT-002.xml',
    pdfUrl: 'https://storage.example.com/facturas/FACT-002.pdf',
    validadaSAT: true,
    estatusSAT: 'vigente' as const,
    fechaValidacionSAT: new Date('2024-07-11'),
    status: 'pagada' as const,
    pagada: true,
    fechaPago: new Date('2024-07-20'),
    createdAt: new Date('2024-07-11'),
    updatedAt: new Date(),
    uploadedBy: 'proveedor-2',
  },
  {
    facturaId: 'FACT-003',
    proveedorId: 'proveedor-1',
    proveedorRFC: 'ANO010203XYZ',
    proveedorRazonSocial: 'Aceros del Norte S.A. de C.V.',
    receptorRFC: 'LCD010101A00',
    receptorRazonSocial: 'La Cantera Desarrollos Mineros',
    empresaId: 'empresa-1',
    uuid: 'A1B2C3D4-E5F6-1234-5678-90ABCDEF0003',
    serie: 'A',
    folio: '5830',
    fecha: new Date('2024-07-05'),
    subtotal: 10775.86,
    iva: 1724.14,
    total: 12500.0,
    moneda: 'MXN' as const,
    xmlUrl: 'https://storage.example.com/facturas/FACT-003.xml',
    pdfUrl: 'https://storage.example.com/facturas/FACT-003.pdf',
    validadaSAT: true,
    estatusSAT: 'vigente' as const,
    fechaValidacionSAT: new Date('2024-07-05'),
    ordenCompraId: 'OC-123',
    status: 'aprobada' as const,
    pagada: false,
    createdAt: new Date('2024-07-05'),
    updatedAt: new Date(),
    uploadedBy: 'proveedor-1',
  },
];

export async function migrateMockData() {
  console.log('🚀 Iniciando migración...');
  
  const resultados = {
    proveedores: { success: 0, errors: [] as string[] },
    ordenes: { success: 0, errors: [] as string[] },
    facturas: { success: 0, errors: [] as string[] },
  };

  // Migrar Proveedores (usando setDoc directo)
  console.log('�� Migrando proveedores...');
  for (const proveedor of mockProveedores) {
    try {
      console.log(`  Migrando: ${proveedor.razonSocial}`);
      const docRef = doc(db, 'users', proveedor.uid);
      await setDoc(docRef, {
        ...proveedor,
        createdAt: Timestamp.fromDate(proveedor.createdAt),
        updatedAt: Timestamp.now(),
      });
      resultados.proveedores.success++;
      console.log(`  ✅ ${proveedor.razonSocial}`);
    } catch (error: any) {
      console.error(`  ❌ Error con ${proveedor.razonSocial}:`, error);
      resultados.proveedores.errors.push(
        `${proveedor.razonSocial}: ${error.message}`
      );
    }
  }

  // Migrar Órdenes de Compra
  console.log('📦 Migrando órdenes de compra...');
  for (const orden of mockOrdenesCompra) {
    try {
      console.log(`  Migrando: ${orden.folio}`);
      await database.createOrdenCompra(orden);
      resultados.ordenes.success++;
      console.log(`  ✅ ${orden.folio}`);
    } catch (error: any) {
      console.error(`  ❌ Error con ${orden.folio}:`, error);
      resultados.ordenes.errors.push(`${orden.folio}: ${error.message}`);
    }
  }

  // Migrar Facturas
  console.log('📦 Migrando facturas...');
  for (const factura of mockFacturas) {
    try {
      console.log(`  Migrando: ${factura.folio}`);
      await database.createFactura(factura);
      resultados.facturas.success++;
      console.log(`  ✅ ${factura.folio}`);
    } catch (error: any) {
      console.error(`  ❌ Error con ${factura.folio}:`, error);
      resultados.facturas.errors.push(`${factura.folio}: ${error.message}`);
    }
  }

  console.log('✅ Migración completada:', resultados);

  return {
    success: true,
    data: resultados,
    message: `Migración completada: ${resultados.proveedores.success} proveedores, ${resultados.ordenes.success} órdenes, ${resultados.facturas.success} facturas`,
  };
}
