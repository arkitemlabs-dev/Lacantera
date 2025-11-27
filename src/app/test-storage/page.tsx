'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Página de prueba deshabilitada - Firebase Storage ya no está en uso
export default function TestStoragePage() {
  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Página de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta página de prueba ha sido deshabilitada ya que el sistema ya no usa Firebase Storage.
          </p>
          <p className="text-sm mt-4">
            Los archivos ahora se almacenan usando Firebase Storage pero la integración se maneja a través de server actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
