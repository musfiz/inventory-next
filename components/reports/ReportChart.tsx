'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export type ChartType = 'line' | 'bar' | 'area' | 'donut';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

interface ReportChartProps {
  type: ChartType;
  data: Record<string, any>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  format?: 'currency' | 'number' | 'percent';
  showLegend?: boolean;
  showGrid?: boolean;
  donutInnerRadius?: number;
  donutOuterRadius?: number;
}

const DEFAULT_COLORS = [
  '#6366F1',
  '#22C55E',
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
];

const tooltipStyle = {
  backgroundColor: '#1F2937',
  border: 'none',
  borderRadius: '6px',
  color: '#F9FAFB',
  fontSize: '12px',
};

function formatTooltipValue(value: any, format?: 'currency' | 'number' | 'percent') {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  switch (format) {
    case 'currency':
      return `\u09F3${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent':
      return `${num.toFixed(1)}%`;
    case 'number':
      return num.toLocaleString('en-BD');
    default:
      return String(value);
  }
}

export default function ReportChart({
  type,
  data,
  xKey,
  series,
  height = 300,
  format,
  showLegend = true,
  showGrid = true,
  donutInnerRadius = 60,
  donutOuterRadius = 100,
}: ReportChartProps) {
  if (!data || data.length === 0) return null;

  const colors = series.map((s, i) => s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

  const tooltipFormatter = (value: any) => formatTooltipValue(value, format);

  // ── Donut / Pie ──
  if (type === 'donut') {
    const donutData = data.map((row, i) => ({
      name: row[xKey],
      value: Number(row[series[0]?.key] ?? 0),
      color: colors[i % colors.length],
    }));

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={donutInnerRadius}
              outerRadius={donutOuterRadius}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: any) => [formatTooltipValue(value, format), '']}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Line / Bar / Area ──
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const axes = (
      <>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          tickLine={{ stroke: '#4B5563' }}
          axisLine={{ stroke: '#4B5563' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          tickLine={{ stroke: '#4B5563' }}
          axisLine={{ stroke: '#4B5563' }}
          tickFormatter={(v) => formatTooltipValue(v, format)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={tooltipFormatter}
        />
        {showLegend && series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        )}
      </>
    );

    if (type === 'line') {
      return (
        <LineChart {...commonProps}>
          {axes}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      );
    }

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              fill={`url(#gradient-${s.key})`}
            />
          ))}
        </AreaChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        {axes}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={colors[i]}
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
