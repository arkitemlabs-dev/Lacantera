'use client';

import { useState } from 'react';

export default function TestSyncPage() {
  const [patron, setPatron] = useState('ARQUITECTURA');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mappings, setMappings] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/erp/sync-proveedor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patron }),
      });

      const data = await response.json();
      setResult(data);

      // Si fue exitoso, obtener los mappings
      if (data.success) {
        await fetchMappings();
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await fetch('/api/erp/sync-proveedor');
      const data = await response.json();
      setMappings(data);
    } catch (error) {
      console.error('Error fetching mappings:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🔄 Test de Sincronización de Proveedores
      </h1>

      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Sincronizar Proveedor
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Patrón de Búsqueda:
          </label>
          <input
            type="text"
            value={patron}
            onChange={(e) => setPatron(e.target.value)}
            placeholder="Ej: ARQUITECTURA, ARQUI, P00443"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
            Puedes buscar por nombre, código o RFC del proveedor
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={loading || !patron}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          {loading ? '⏳ Sincronizando...' : '🚀 Sincronizar Proveedor'}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginBottom: '2rem',
            padding: '1rem',
            border: `2px solid ${result.success ? '#10b981' : '#ef4444'}`,
            borderRadius: '8px',
            backgroundColor: result.success ? '#ecfdf5' : '#fef2f2',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: result.success ? '#065f46' : '#991b1b',
            }}
          >
            {result.success ? '✅ Sincronización Exitosa' : '❌ Error en la Sincronización'}
          </h3>

          <p style={{ marginBottom: '1rem' }}>
            <strong>Patrón:</strong> {result.patron}
          </p>

          {result.portalUserId && (
            <p style={{ marginBottom: '1rem' }}>
              <strong>Usuario Portal:</strong> {result.portalUserId}
            </p>
          )}

          <p style={{ marginBottom: '1rem', fontStyle: 'italic', color: '#666' }}>
            {result.message}
          </p>

          {result.results && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Resultados por Empresa:
              </h4>

              {Object.entries(result.results).map(([empresa, data]: [string, any]) => (
                <div
                  key={empresa}
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: data.success ? '#f0fdf4' : '#fef2f2',
                  }}
                >
                  <h5 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    {empresa}
                  </h5>

                  {data.success ? (
                    <>
                      <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        <strong>Acción:</strong> {data.action === 'created' ? '🆕 Creado' : '♻️ Actualizado'}
                      </p>
                      {data.proveedor && (
                        <>
                          <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            <strong>Código:</strong> {data.proveedor.codigo}
                          </p>
                          <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            <strong>Nombre:</strong> {data.proveedor.nombre}
                          </p>
                          {data.proveedor.rfc && (
                            <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                              <strong>RFC:</strong> {data.proveedor.rfc}
                            </p>
                          )}
                        </>
                      )}
                      <p style={{ fontSize: '0.875rem', color: '#059669' }}>
                        ✓ {data.message}
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                      ✗ {data.message || data.error || 'Error desconocido'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.error && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
              <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                <strong>Error:</strong> {result.error}
              </p>
              {result.details && (
                <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem', overflow: 'auto' }}>
                  {result.details}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {mappings && (
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            📋 Mappings Actuales del Usuario
          </h3>

          <p style={{ marginBottom: '1rem' }}>
            <strong>Usuario:</strong> {mappings.userId}
          </p>

          <p style={{ marginBottom: '1rem' }}>
            <strong>Total de Mappings:</strong> {mappings.totalMappings}
          </p>

          {mappings.mappings && mappings.mappings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e5e7eb' }}>
                    <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left' }}>Empresa</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left' }}>Código Proveedor</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left' }}>Activo</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left' }}>Creado</th>
                    <th style={{ padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left' }}>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.mappings.map((mapping: any) => (
                    <tr key={mapping.id}>
                      <td style={{ padding: '0.5rem', border: '1px solid #d1d5db' }}>{mapping.empresa_code}</td>
                      <td style={{ padding: '0.5rem', border: '1px solid #d1d5db' }}>{mapping.erp_proveedor_code}</td>
                      <td style={{ padding: '0.5rem', border: '1px solid #d1d5db' }}>
                        {mapping.activo ? '✅' : '❌'}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #d1d5db' }}>
                        {new Date(mapping.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.5rem', border: '1px solid #d1d5db' }}>
                        {new Date(mapping.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No hay mappings registrados para este usuario
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fffbeb' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          💡 Instrucciones
        </h3>
        <ul style={{ marginLeft: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5' }}>
          <li>Ingresa un patrón de búsqueda (nombre, código o RFC del proveedor)</li>
          <li>Haz clic en "Sincronizar Proveedor"</li>
          <li>El sistema buscará el proveedor en las 3 empresas (La Cantera, Peralillo, Plaza Galereña)</li>
          <li>Se crearán los mappings en la tabla portal_proveedor_mapping</li>
          <li>Verás los resultados detallados por empresa</li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        <p>
          <strong>Códigos conocidos de ARQUITECTURA Y CONSULTORIA EMPRESARIAL:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>La Cantera: P00443</li>
          <li>Peralillo: P00443</li>
          <li>Plaza Galereña: PV-56</li>
        </ul>
      </div>
    </div>
  );
}
