import { KpiCards } from '@/components/dashboard/kpi-cards';
import { SupplierPerformance } from '@/components/dashboard/supplier-performance';
import { SpendingChart } from '@/components/dashboard/spending-chart';

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <KpiCards />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
             <SupplierPerformance />
          </div>
          <div className="lg:col-span-3">
             <SpendingChart />
          </div>
        </div>
      </div>
    </>
  );
}
