import { useMemo, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import LoadingState from '../components/LoadingState';
import type { AppOutletContext } from '../components/AppShell';
import { useChartQuery } from '../hooks/useKanjiQueries';
import type { ChartBucket, ChartXAxis, ChartYAxis } from '../types/kanji';

interface ChartConfig {
  id: string;
  xAxis: ChartXAxis;
  yAxis: ChartYAxis;
}

interface AxisOption<Value extends ChartXAxis | ChartYAxis> {
  value: Value;
  label: string;
}

const xAxisOptions: Array<AxisOption<ChartXAxis>> = [
  { value: 'jlpt', label: 'JLPT' },
  { value: 'stroke_count', label: 'число черт' },
  { value: 'grade', label: 'класс' },
  { value: 'radical_top', label: 'топ-10 радикалов' },
];

const yAxisOptions: Array<AxisOption<ChartYAxis>> = [
  { value: 'count', label: 'количество кандзи' },
  { value: 'avg_freq', label: 'средняя частотность' },
  { value: 'avg_words', label: 'среднее число слов' },
  { value: 'avg_examples', label: 'среднее число примеров' },
  { value: 'avg_radicals', label: 'среднее число радикалов' },
  { value: 'avg_readings', label: 'среднее число чтений' },
  { value: 'avg_strokes', label: 'среднее число черт' },
];

const presets: Array<Omit<ChartConfig, 'id'>> = [
  { xAxis: 'jlpt', yAxis: 'avg_freq' },
  { xAxis: 'stroke_count', yAxis: 'avg_words' },
  { xAxis: 'grade', yAxis: 'avg_strokes' },
  { xAxis: 'radical_top', yAxis: 'count' },
];

const labelForAxisValue = (axis: ChartXAxis, value: number | string | null) => {
  if (value === null || value === 'none') {
    return 'без';
  }

  if (axis === 'jlpt') {
    return `N${value}`;
  }

  if (axis === 'grade') {
    return `${value} кл.`;
  }

  return String(value);
};

const axisLabel = <Value extends ChartXAxis | ChartYAxis,>(options: Array<AxisOption<Value>>, value: Value) =>
  options.find((option) => option.value === value)?.label ?? value;

const AxisSelector = <Value extends ChartXAxis | ChartYAxis,>({
  caption,
  options,
  value,
  onChange,
}: {
  caption: string;
  options: Array<AxisOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div className="axis-selector" ref={menuRef} onBlurCapture={handleBlur}>
      <span>{caption}</span>
      <button className="axis-link" type="button" onClick={() => setOpen((current) => !current)}>
        {axisLabel(options, value)}
      </button>
      {open ? (
        <div className="axis-menu">
          {options.map((option) => (
            <button
              className={option.value === value ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const chartData = (buckets: ChartBucket[], xAxis: ChartXAxis) =>
  buckets.map((bucket) => ({
    name: labelForAxisValue(xAxis, bucket.label),
    value: bucket.value,
    count: bucket.count,
  }));

const ChartGraphic = ({
  data,
  isRadicalChart,
  yLabel,
}: {
  data: ReturnType<typeof chartData>;
  isRadicalChart: boolean;
  yLabel: string;
}) => (
  <div className="chart-visual">
    <ResponsiveContainer width="100%" height={292}>
      {isRadicalChart ? (
        <BarChart data={data} margin={{ top: 18, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e7e7e7" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="name" interval={0} tick={{ fill: '#606060', fontSize: 12 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: '#606060', fontSize: 12 }} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{ border: '1px solid #dddddd', borderRadius: 5, boxShadow: 'none' }}
            cursor={{ fill: '#f2f2f2' }}
            formatter={(value) => [String(value), yLabel]}
          />
          <Bar dataKey="value" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={34} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 18, right: 18, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e7e7e7" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="name" tick={{ fill: '#606060', fontSize: 12 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: '#606060', fontSize: 12 }} tickLine={false} width={50} />
          <Tooltip
            contentStyle={{ border: '1px solid #dddddd', borderRadius: 5, boxShadow: 'none' }}
            cursor={{ stroke: '#c9c9c9', strokeWidth: 1 }}
            formatter={(value) => [String(value), yLabel]}
          />
          <Line
            activeDot={{ r: 5, fill: '#111111', stroke: '#ffffff', strokeWidth: 2 }}
            dataKey="value"
            dot={{ r: 3.5, fill: '#ffffff', stroke: '#111111', strokeWidth: 2 }}
            stroke="#111111"
            strokeWidth={2.4}
            type="monotone"
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  </div>
);

const ChartCard = ({
  chart,
  filters,
  onChange,
  onClose,
}: {
  chart: ChartConfig;
  filters: AppOutletContext['filters'];
  onChange: (patch: Partial<ChartConfig>) => void;
  onClose: () => void;
}) => {
  const criteria = useMemo(() => ({ filters }), [filters]);
  const chartQuery = useChartQuery(criteria, chart.xAxis, chart.yAxis);
  const buckets = useMemo(() => chartQuery.data ?? [], [chartQuery.data]);
  const isInitialLoading = chartQuery.isLoading && buckets.length === 0;
  const isRadicalChart = chart.xAxis === 'radical_top';
  const yLabel = axisLabel(yAxisOptions, chart.yAxis);
  const data = useMemo(() => chartData(buckets, chart.xAxis), [buckets, chart.xAxis]);

  return (
    <section className="chart-card">
      <div className="chart-card-header">
        <div className="chart-sentence">
          <AxisSelector caption="По X" options={xAxisOptions} value={chart.xAxis} onChange={(value) => onChange({ xAxis: value })} />
          <AxisSelector caption="по Y" options={yAxisOptions} value={chart.yAxis} onChange={(value) => onChange({ yAxis: value })} />
        </div>
        <button className="icon-button compact-icon" type="button" onClick={onClose} aria-label="Закрыть диаграмму">
          <X size={16} />
        </button>
      </div>

      {isInitialLoading ? <LoadingState label="Считаем диаграмму" /> : null}
      {chartQuery.isError ? <div className="empty-state">{chartQuery.error.message}</div> : null}
      {!isInitialLoading && !chartQuery.isError ? (
        data.length === 0 ? <div className="empty-state">Нет данных под текущие фильтры.</div> : <ChartGraphic data={data} isRadicalChart={isRadicalChart} yLabel={yLabel} />
      ) : null}
    </section>
  );
};

const ChartsPage = () => {
  const { filters } = useOutletContext<AppOutletContext>();
  const [charts, setCharts] = useState<ChartConfig[]>([{ id: 'default', ...presets[0] }]);

  const addChart = () => {
    setCharts((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        ...presets[current.length % presets.length],
      },
    ]);
  };

  const updateChart = (id: string, patch: Partial<ChartConfig>) => {
    setCharts((current) =>
      current.map((chart) => (chart.id === id ? { ...chart, ...patch } : chart)),
    );
  };

  const closeChart = (id: string) => {
    setCharts((current) => current.filter((chart) => chart.id !== id));
  };

  return (
    <div className="page-stack">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Диаграммы</p>
          <h1>Срезы базы</h1>
          <p>Графики пересчитываются на бекенде с учётом фильтров справа.</p>
        </div>
      </section>

      <div className="chart-page">
        {charts.map((chart) => (
          <ChartCard
            chart={chart}
            filters={filters}
            key={chart.id}
            onChange={(patch) => updateChart(chart.id, patch)}
            onClose={() => closeChart(chart.id)}
          />
        ))}

        <button className="chart-add-button" type="button" onClick={addChart}>
          <span />
          <Plus size={20} />
          <span />
        </button>
      </div>
    </div>
  );
};

export default ChartsPage;
