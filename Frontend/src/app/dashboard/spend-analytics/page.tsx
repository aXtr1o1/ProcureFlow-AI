"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/services/api";

const COLORS = {
  blue: "#1d4ed8",
  teal: "#0f766e",
  amber: "#b45309",
  rose: "#be123c",
  sky: "#0369a1",
  olive: "#4d7c0f",
  rust: "#9a3412",
  slate: "#475569",
};

const PIE_COLORS = [
  COLORS.blue,
  COLORS.teal,
  COLORS.amber,
  COLORS.rose,
  COLORS.sky,
  COLORS.olive,
  COLORS.rust,
  COLORS.slate,
];

async function loadSpend(): Promise<DashboardOverview> {
  return getDashboardOverview();
}

function toChartData(data: Record<string, number>) {
  return Object.entries(data)
    .map(([name, value]) => ({
      name,
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function toTimelineData(data: Record<string, number>) {
  return Object.entries(data)
    .map(([name, value]) => ({
      name,
      value: Number(value) || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function sumValues(data: Record<string, number>) {
  return Object.values(data).reduce(
    (total, value) => total + (Number(value) || 0),
    0
  );
}

export default function SpendAnalyticsPage() {
  const [data, setData] =
    useState<DashboardOverview | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSpend()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load spend analytics."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const spend = data?.spend;
  const analytics = data?.spend_analytics;

  return (
    <main className="min-h-screen bg-surface pt-6 pb-12">
      <div className="max-w-container-max mx-auto px-margin-desktop">

        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            ← Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-on-surface">
            Spend Analytics
          </h1>

          <p className="mt-2 text-on-surface-variant">
            Procurement spend, invoice value and payment analytics.
          </p>
        </div>

        <section className="mt-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-on-surface">
              Spend Breakdown
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Procurement spend across key business dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <VerticalBarChart
              title="Department"
              data={analytics?.by_department ?? {}}
              color={COLORS.blue}
            />
            <HorizontalBarChart
              title="Business Unit"
              data={analytics?.by_business_unit ?? {}}
              color={COLORS.teal}
            />
            <DonutChart
              title="Category"
              data={analytics?.by_category ?? {}}
            />
            <PieChartCard
              title="Vendor"
              data={analytics?.by_vendor ?? {}}
            />
            <AreaTrendChart
              title="Location"
              data={analytics?.by_location ?? {}}
              color={COLORS.sky}
            />
            <LineTrendChart
              title="Month"
              data={analytics?.by_month ?? {}}
              color={COLORS.olive}
            />
            <VerticalBarChart
              title="Quarter"
              data={analytics?.by_quarter ?? {}}
              color={COLORS.amber}
              sortTimeline
            />
            <ProgressBarsChart
              title="Project"
              data={analytics?.by_project ?? {}}
              color={COLORS.rose}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5">
      <p className="text-sm text-on-surface-variant">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function ChartShell({
  title,
  total,
  empty,
  children,
}: {
  title: string;
  total: number;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-on-surface">
          Spend by {title}
        </h3>
        {!empty && (
          <span className="shrink-0 text-xs font-medium text-on-surface-variant">
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {empty ? (
        <p className="mt-4 text-sm text-on-surface-variant">
          No data available.
        </p>
      ) : (
        <div className="mt-4 h-56 w-full">{children}</div>
      )}
    </div>
  );
}

function VerticalBarChart({
  title,
  data,
  color,
  sortTimeline = false,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
  sortTimeline?: boolean;
}) {
  const chartData = useMemo(
    () => (sortTimeline ? toTimelineData(data) : toChartData(data)),
    [data, sortTimeline]
  );

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#64748b", fontSize: 11 }}
            interval={0}
            angle={chartData.length > 3 ? -20 : 0}
            textAnchor={chartData.length > 3 ? "end" : "middle"}
            height={chartData.length > 3 ? 48 : 28}
          />
          <YAxis
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
            tick={{ fill: "#64748b", fontSize: 11 }}
            width={52}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function HorizontalBarChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function DonutChart({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={46}
            outerRadius={74}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function PieChartCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            outerRadius={68}
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            wrapperStyle={{ fontSize: 11 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function AreaTrendChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={`area-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
            tick={{ fill: "#64748b", fontSize: 11 }}
            width={52}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#area-${title})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function LineTrendChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const chartData = useMemo(() => toTimelineData(data), [data]);

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
            tick={{ fill: "#64748b", fontSize: 11 }}
            width={52}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={tooltipStyle}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

function ProgressBarsChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);
  const max = chartData[0]?.value || 1;

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <div className="flex h-full flex-col justify-center gap-3 overflow-auto pr-1">
        {chartData.map((item) => {
          const pct = Math.max((item.value / max) * 100, 6);
          return (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-on-surface-variant">
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold text-on-surface">
                  {formatCurrency(item.value)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

function RankedBarsChart({
  title,
  data,
  color,
}: {
  title: string;
  data: Record<string, number>;
  color: string;
}) {
  const chartData = useMemo(() => toChartData(data), [data]);
  const max = chartData[0]?.value || 1;

  return (
    <ChartShell
      title={title}
      total={sumValues(data)}
      empty={chartData.length === 0}
    >
      <div className="flex h-full flex-col justify-center gap-2.5 overflow-auto pr-1">
        {chartData.map((item, index) => {
          const pct = Math.max((item.value / max) * 100, 8);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs font-semibold text-on-surface-variant">
                #{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-on-surface">
                    {item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-on-surface">
                    {formatCurrency(item.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-slate-200/70">
                  <div
                    className="h-full rounded"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        Loading spend analytics...
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-surface pt-24">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <p className="text-red-600">{message}</p>
      </div>
    </main>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  borderColor: "#e2e8f0",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}