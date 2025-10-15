import { Header } from '@/components/header';
import { AddSupplierForm } from '@/components/proveedores/add-supplier-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NuevoProveedorPage() {
  return (
    <>
      <Header title="Agregar Nuevo Proveedor" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Información del Proveedor</CardTitle>
            <CardDescription>
              Completa el formulario para registrar un nuevo proveedor. Sube un
              documento para la verificación de cumplimiento por IA.
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
