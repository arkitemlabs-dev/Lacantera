import { Header } from '@/components/header';
import { Nav } from '@/components/nav';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Nav />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
