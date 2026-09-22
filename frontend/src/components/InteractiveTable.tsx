import { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon
} from 'lucide-react';
import type { TableData } from '../types';

interface InteractiveTableProps {
  data: TableData;
}

export const InteractiveTable = ({ data }: InteractiveTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [copied, setCopied] = useState(false);

  const columns = data.columns || [];
  const rawRows = data.rows || [];

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rawRows;
    const lower = searchTerm.toLowerCase();
    return rawRows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [rawRows, searchTerm, columns]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredRows, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleCopy = () => {
    if (!columns.length || !rawRows.length) return;
    const header = columns.map((c) => c.label).join('\t');
    const body = rawRows.map((r) => columns.map((c) => r[c.key] ?? '').join('\t')).join('\n');
    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    if (!columns.length || !rawRows.length) return;
    const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const body = rawRows
      .map((r) => columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title.replace(/\s+/g, '_').toLowerCase() || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-zinc-200/80 my-4 shadow-sm">
      {/* Header & Controls Bar */}
      <div className="p-4 border-b border-zinc-200/60 bg-white/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-100 border border-zinc-200">
            <TableIcon className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">{data.title || 'Data Table'}</h4>
            {data.source_file && (
              <p className="text-xs text-zinc-500 font-mono">Source: {data.source_file}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Instant Search */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-400 text-zinc-900 placeholder:text-zinc-400 shadow-xs"
            />
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy Table"
            className="p-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleDownloadCsv}
            title="Export to CSV"
            className="p-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-700">
          <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-900 uppercase font-semibold tracking-wider">
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 cursor-pointer hover:bg-zinc-100/80 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      <span className="text-zinc-400 group-hover:text-zinc-700">
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-zinc-900" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-zinc-900" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 bg-white/70">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-50/90 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-zinc-800">
                      {typeof row[col.key] === 'number'
                        ? Number(row[col.key]).toLocaleString()
                        : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-400">
                  No records match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="px-4 py-3 border-t border-zinc-200/60 bg-white/50 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span>
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
          </span>
          <span className="hidden sm:inline text-zinc-300">|</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-xs text-zinc-700 focus:outline-hidden"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-medium text-zinc-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 rounded border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
