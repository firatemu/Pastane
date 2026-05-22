'use client';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';

export function DataTable<T>({
  data,
  columns,
  empty = 'Kayıt bulunamadı.',
}: Readonly<{ data: T[]; columns: ColumnDef<T>[]; empty?: string }>): React.JSX.Element {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
      <table className="min-w-full text-sm">
        <thead className="bg-surface-container-low">
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                  key={h.id}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((r) => (
              <tr className="transition hover:bg-surface-variant/25" key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td className="px-4 py-3 align-top" key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-4 py-10 text-center text-on-surface-variant"
                colSpan={columns.length}
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
