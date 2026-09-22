import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart2,
  LineChart as LineIcon,
  TrendingUp,
  PieChart as PieIcon,
  Table as TableIcon,
  Sparkles
} from 'lucide-react';
import type { ChartConfig } from '../types';

interface InteractiveChartProps {
  config: ChartConfig;
}

const MONOCHROME_COLORS = [
  '#18181b', // zinc-900
  '#52525b', // zinc-600
  '#71717a', // zinc-500
  '#a1a1aa', // zinc-400
  '#27272a', // zinc-800
  '#3f3f46', // zinc-700
  '#d4d4d8', // zinc-300
];

export const InteractiveChart = ({ config }: InteractiveChartProps) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>(
    config.chart_type || 'bar'
  );
  const [showTableView, setShowTableView] = useState(false);

  const data = config.data || [];
  const xKey = config.x_key || 'name';
  const yKeys = config.y_keys && config.y_keys.length > 0 ? config.y_keys : ['value'];

  // Custom glass tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-3 py-2 rounded-xl shadow-glass-md border border-zinc-200/80 text-xs">
          <p className="font-semibold text-zinc-900 mb-1">{`${label || payload[0].name}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: entry.color || MONOCHROME_COLORS[index % MONOCHROME_COLORS.length] }}
                />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-medium text-zinc-900">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-zinc-200/80 my-4 shadow-sm">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-zinc-200/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-zinc-600" />
              <span>Interactive Visualization</span>
            </span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-900 mt-1">{config.title}</h4>
          {config.description && (
            <p className="text-xs text-zinc-500 mt-0.5">{config.description}</p>
          )}
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/60 self-start sm:self-auto">
          <button
            onClick={() => {
              setChartType('bar');
              setShowTableView(false);
            }}
            title="Bar Chart"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !showTableView && chartType === 'bar'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setChartType('line');
              setShowTableView(false);
            }}
            title="Line Chart"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !showTableView && chartType === 'line'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setChartType('area');
              setShowTableView(false);
            }}
            title="Area Chart"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !showTableView && chartType === 'area'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setChartType('pie');
              setShowTableView(false);
            }}
            title="Pie Chart"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !showTableView && chartType === 'pie'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-zinc-300 mx-0.5" />

          <button
            onClick={() => setShowTableView(!showTableView)}
            title={showTableView ? 'Show Chart' : 'Show Data Points'}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showTableView ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View Content: Chart or Raw Values Table */}
      {showTableView ? (
        <div className="overflow-x-auto max-h-72 border border-zinc-200/60 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-900 font-semibold">
              <tr>
                <th className="px-3 py-2">{xKey}</th>
                {yKeys.map((k) => (
                  <th key={k} className="px-3 py-2">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 bg-white/80">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 font-medium text-zinc-800">{String(row[xKey])}</td>
                  {yKeys.map((k) => (
                    <td key={k} className="px-3 py-2 text-zinc-600 font-mono">
                      {typeof row[k] === 'number' ? row[k].toLocaleString() : String(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey={xKey}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {yKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={MONOCHROME_COLORS[i % MONOCHROME_COLORS.length]}
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey={xKey}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {yKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={MONOCHROME_COLORS[i % MONOCHROME_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#ffffff', stroke: MONOCHROME_COLORS[i % MONOCHROME_COLORS.length], strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey={xKey}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {yKeys.map((key, i) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={MONOCHROME_COLORS[i % MONOCHROME_COLORS.length]}
                    fill={MONOCHROME_COLORS[i % MONOCHROME_COLORS.length]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : (
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Pie
                  data={data}
                  dataKey={yKeys[0]}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={MONOCHROME_COLORS[index % MONOCHROME_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
