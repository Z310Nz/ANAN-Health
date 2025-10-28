'use client';

import type { PremiumCalculation } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, RefreshCw, Info } from 'lucide-react';

type SummaryStepProps = {
  calculation: PremiumCalculation;
  onStartOver: () => void;
  onExport: () => void;
};

const chartConfig = {
  Base: {
    label: "เบี้ยประกันหลัก",
    color: "hsl(var(--chart-1))",
  },
  Riders: {
    label: "เบี้ยอนุสัญญา",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function SummaryStep({ calculation, onStartOver, onExport }: SummaryStepProps) {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">สรุปผลการคำนวณเบี้ยประกัน</CardTitle>
          <CardDescription>{calculation.summary}</CardDescription>
        </CardHeader>
        {calculation.note && (
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>หมายเหตุสำคัญ</AlertTitle>
              <AlertDescription>{calculation.note}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>เบี้ยประกันรายปี</CardTitle>
          <CardDescription>กราฟแสดงส่วนประกอบของเบี้ยประกันโดยประมาณในแต่ละปี</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer>
              <BarChart data={calculation.chartData} accessibilityLayer>
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => currencyFormatter.format(value as number).replace('฿','')}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent
                    formatter={(value) => currencyFormatter.format(value as number)}
                    indicator="dot"
                  />}
                />
                <Legend />
                <Bar dataKey="Base" stackId="a" fill="var(--color-Base)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Riders" stackId="a" fill="var(--color-Riders)" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ตารางเบี้ยประกันรายปี</CardTitle>
          <CardDescription>รายละเอียดเบี้ยประกันของคุณในแต่ละปี</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[100px]">ปีที่</TableHead>
                <TableHead>เบี้ยประกันหลัก</TableHead>
                <TableHead>เบี้ยอนุสัญญา</TableHead>
                <TableHead className="text-right">เบี้ยรวมรายปี</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculation.yearlyBreakdown.map((item) => (
                <TableRow key={item.year}>
                  <TableCell className="font-medium">{item.year}</TableCell>
                  <TableCell>{currencyFormatter.format(item.base)}</TableCell>
                  <TableCell>{currencyFormatter.format(item.riders)}</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatter.format(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button onClick={onStartOver} variant="outline" className="rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          คำนวณใหม่
        </Button>
        <Button onClick={onExport} className="rounded-full">
          <FileDown className="mr-2 h-4 w-4" />
          ส่งออกเป็น CSV
        </Button>
      </div>
    </div>
  );
}
