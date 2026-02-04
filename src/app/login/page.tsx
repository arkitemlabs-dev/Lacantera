import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { LoginForm } from './login-form';

/**
 * Página de Login (/login)
 * Server Component que evita mostrar el formulario si el usuario ya está autenticado.
 */
export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Si ya hay sesión, redirigimos directamente al dashboard sin mostrar el login
  if (session) {
    const role = session.user?.role;
    if (role === 'proveedor') {
      redirect('/proveedores/dashboard');
    } else {
      redirect('/dashboard');
    }
  }

  // Si no hay sesión, mostramos el formulario de login (Client Component)
  return <LoginForm />;
}
