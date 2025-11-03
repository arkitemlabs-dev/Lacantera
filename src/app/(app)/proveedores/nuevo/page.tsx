
'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { AddSupplierForm } from '@/components/proveedores/add-supplier-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NuevoProveedorPage() {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/proveedores">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Agregar Nuevo Proveedor</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
            <CardDescription>
              Completa el formulario para registrar un nuevo proveedor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddSupplierForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
