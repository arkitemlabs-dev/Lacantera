// src/app/select-empresa/page.tsx
// Ya no se permite cambiar de empresa sin logout.
// Redirige al login.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectEmpresaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
