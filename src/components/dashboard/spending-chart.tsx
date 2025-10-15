'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { spendingData } from '@/lib/data';

const chartConfig = {
  gastos: {
    label: 'Gastos',
  },
  'Aceros del Norte': {
    label: 'Aceros del Norte',
    color: 'hsl(var(--chart-1))',
  },
  'Materiales ABC': {
    label: 'Materiales ABC',
    color: 'hsl(var(--chart-2))',
  },
  'Constructora Rápida': {
    label: 'Constructora Rápida',
    color: 'hsl(var(--chart-3))',
  },
};

export function SpendingChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Proveedor</CardTitle>
        <CardDescription>Enero - Julio 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={spendingData}>
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}K`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
            />
            <Bar
              dataKey="Aceros del Norte"
              stackId="a"
              fill={chartConfig['Aceros del Norte'].color}
            />
            <Bar
              dataKey="Materiales ABC"
              stackId="a"
              fill={chartConfig['Materiales ABC'].color}
            />
            <Bar
              dataKey="Constructora Rápida"
              stackId="a"
              fill={chartConfig['Constructora Rápida'].color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
