"use client";

import type { PremiumCalculation } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, Info } from "lucide-react";

type SummaryStepProps = {
  calculation: PremiumCalculation;
  onStartOver: () => void;
};

const chartConfig = {
  Base: {
    label: "Base Premium",
    color: "hsl(var(--chart-1))",
  },
  Riders: {
    label: "Riders",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function SummaryStep({
  calculation,
  onStartOver,
}: SummaryStepProps) {
  // Calculate total premium to be paid over the entire coverage period
  const totalCoverageCost =
    calculation.yearlyBreakdown && calculation.yearlyBreakdown.length > 0
      ? calculation.yearlyBreakdown[calculation.yearlyBreakdown.length - 1]
          .cumulativeTotal ?? 0
      : 0;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">
            Your Premium Preview
          </CardTitle>
          <CardDescription>{calculation.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculation.note && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important Note</AlertTitle>
              <AlertDescription>{calculation.note}</AlertDescription>
            </Alert>
          )}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6 mt-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">
                จำนวนเงินทั้งหมดที่ต้องจ่ายตลอดการคุ้มครอง
              </p>
              <p className="text-4xl font-bold text-teal-600">
                {isFinite(totalCoverageCost)
                  ? currencyFormatter.format(totalCoverageCost)
                  : "ไม่สามารถคำนวณได้"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Premium Over Time</CardTitle>
          <CardDescription>
            This chart shows the breakdown of your estimated annual premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer>
              <LineChart data={calculation.chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) =>
                    currencyFormatter.format(value as number)
                  }
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        currencyFormatter.format(value as number)
                      }
                      indicator="dot"
                    />
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Base"
                  stroke="var(--color-Base)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Riders"
                  stroke="var(--color-Riders)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly Breakdown</CardTitle>
          <CardDescription>
            A detailed look at your premium each year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[100px]">Year</TableHead>
                  <TableHead>Base Premium</TableHead>
                  <TableHead>Riders</TableHead>
                  <TableHead className="text-right">Total Annual</TableHead>
                  <TableHead className="text-right">Cumulative Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculation.yearlyBreakdown.map((item) => (
                  <TableRow key={item.year}>
                    <TableCell className="font-medium">{item.year}</TableCell>
                    <TableCell>{currencyFormatter.format(item.base)}</TableCell>
                    <TableCell>
                      {currencyFormatter.format(item.riders)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {currencyFormatter.format(item.total)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-teal-600">
                      {currencyFormatter.format(item.cumulativeTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button onClick={onStartOver} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
      </div>
    </div>
  );
}
