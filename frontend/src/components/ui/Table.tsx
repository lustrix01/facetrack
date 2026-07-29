import React from 'react';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
}: TableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/80 shadow-2xs bg-white">
      <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-4 py-3 whitespace-nowrap ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.length > 0 ? (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 whitespace-nowrap text-xs text-slate-900 ${
                        col.className || ''
                      }`}
                    >
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-xs text-slate-400 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
