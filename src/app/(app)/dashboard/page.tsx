import { Header } from '@/components/header';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { SpendingChart } from '@/components/dashboard/spending-chart';
import { AttentionSuppliers } from '@/components/dashboard/attention-suppliers';

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <KpiCards />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <SpendingChart />
          </div>
          <div className="lg:col-span-3">
            <AttentionSuppliers />
          </div>
        </div>
      </div>
    </>
  );
}
