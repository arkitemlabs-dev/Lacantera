
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { SupplierInvoicingChart } from '@/components/dashboard/supplier-invoicing-chart';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { AttentionSuppliers } from '@/components/dashboard/attention-suppliers';

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <KpiCards />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7 lg:gap-8">
          <div className="lg:col-span-4 flex flex-col gap-8">
             <SupplierInvoicingChart />
          </div>
          <div className="lg:col-span-3 flex flex-col gap-8">
            <AttentionSuppliers />
          </div>
        </div>
         <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7 lg:gap-8">
           <div className="lg:col-span-7">
              <RecentActivity />
           </div>
         </div>
      </div>
    </>
  );
}
