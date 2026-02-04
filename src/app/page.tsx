import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';

/**
 * Página inicial (/)
 * Actúa como un "router" que decide a dónde enviar al usuario según su estado de autenticación.
 */
export default async function IndexPage() {
  const session = await getServerSession(authOptions);

  // Si no hay sesión, mandamos al login
  if (!session) {
    redirect('/login');
  }

  // Si está autenticado, decidimos a qué dashboard enviarlo según su rol
  const role = session.user?.role;

  if (role === 'proveedor') {
    redirect('/proveedores/dashboard');
  }

  // Por defecto (admin u otros roles), al dashboard principal
  redirect('/dashboard');
}
