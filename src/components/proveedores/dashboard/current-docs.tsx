
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function CurrentDocs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos vigentes</CardTitle>
        <CardDescription>
          Estado de la documentación requerida.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-4 w-full rounded-full bg-secondary">
          <Progress value={85} className="absolute h-4 bg-blue-600 rounded-l-full" />
          <div className="absolute h-4 bg-yellow-500 rounded-none" style={{ left: '85%', width: '10%' }}></div>
          <div className="absolute h-4 bg-red-500 rounded-r-full" style={{ left: '95%', width: '5%' }}></div>
        </div>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span>Vigente (85%)</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                <span>Por vencer (10%)</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span>Vencido (5%)</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
