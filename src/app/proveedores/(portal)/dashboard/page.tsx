
import { KpiCards } from '@/components/proveedores/dashboard/kpi-cards';
import { RecentActivity } from '@/components/proveedores/dashboard/recent-activity';
import { Alerts } from '@/components/proveedores/dashboard/alerts';
import { CurrentDocs } from '@/components/proveedores/dashboard/current-docs';

export default function SupplierDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Inicio</h2>
        </div>
        <KpiCards />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
                <RecentActivity />
            </div>
            <div className="col-span-3 space-y-4">
                <Alerts />
                <CurrentDocs />
            </div>
        </div>
    </div>
  );
}
