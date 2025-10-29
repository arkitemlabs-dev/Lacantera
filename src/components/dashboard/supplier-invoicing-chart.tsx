'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const invoicingData = [
  { name: 'Aceros del Norte', facturado: 45600 },
  { name: 'Logística Express', facturado: 29800 },
  { name: 'Componentes Globales', facturado: 78200 },
  { name: 'Maquinaria Pesada', facturado: 19500 },
  { name: 'Consultoría Integral', facturado: 5500 },
];


export function SupplierInvoicingChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturación por Proveedor</CardTitle>
        <CardDescription>Total facturado en el último período.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={invoicingData} layout="vertical">
            <XAxis
              type="number"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Number(value) / 1000}K`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={120}
              />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
               formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))}
            />
            <Bar
              dataKey="facturado"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
