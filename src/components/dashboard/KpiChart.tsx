import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { Kpi } from '@/types/sfm';
import { useKpiValues } from '@/hooks/useSfmData';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface KpiChartProps {
  kpi: Kpi;
  categoryColor: string;
}

export function KpiChart({ kpi, categoryColor }: KpiChartProps) {
  const { data: values, isLoading } = useKpiValues(kpi.id);

  const chartData = useMemo(() => {
    if (!values) return [];
    return values.map((v, index) => ({
      name: v.week_number ? `S${v.week_number}` : `W${index + 1}`,
      value: Number(v.value),
      target: kpi.target_value ? Number(kpi.target_value) : undefined,
      status: v.status,
    }));
  }, [values, kpi.target_value]);

  const latestValue = values?.[values.length - 1];
  const previousValue = values?.[values.length - 2];
  
  const trend = useMemo(() => {
    if (!latestValue || !previousValue) return 'stable';
    const latest = Number(latestValue.value);
    const previous = Number(previousValue.value);
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  }, [latestValue, previousValue]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = latestValue?.status === 'green' 
    ? 'hsl(var(--status-green))' 
    : latestValue?.status === 'orange' 
      ? 'hsl(var(--status-orange))' 
      : latestValue?.status === 'red' 
        ? 'hsl(var(--status-red))' 
        : 'hsl(var(--muted-foreground))';

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!values || values.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
        <Target className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">Aucune donnée</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Value Display */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-data" style={{ color: trendColor }}>
              {Number(latestValue.value).toLocaleString('fr-FR')}
            </span>
            {kpi.unit && (
              <span className="text-sm text-muted-foreground">{kpi.unit}</span>
            )}
          </div>
          {kpi.target_value && (
            <div className="flex items-center gap-1 mt-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Objectif: {Number(kpi.target_value).toLocaleString('fr-FR')} {kpi.unit}
              </span>
            </div>
          )}
        </div>
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${trendColor}20` }}
        >
          <TrendIcon className="h-5 w-5" style={{ color: trendColor }} />
        </div>
      </div>

      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          {kpi.chart_type === 'histogram' ? (
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              {kpi.target_value && (
                <ReferenceLine 
                  y={Number(kpi.target_value)} 
                  stroke="hsl(var(--status-green))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.7}
                />
              )}
              <Bar 
                dataKey="value" 
                fill={categoryColor}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={categoryColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={categoryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              {kpi.target_value && (
                <ReferenceLine 
                  y={Number(kpi.target_value)} 
                  stroke="hsl(var(--status-green))" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.7}
                />
              )}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={categoryColor} 
                strokeWidth={2}
                fill={`url(#gradient-${kpi.id})`}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
