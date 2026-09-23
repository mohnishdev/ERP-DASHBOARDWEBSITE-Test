import type { ReactNode } from "react";

type AdminTableColumn<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
};

type AdminTableProps<T extends Record<string, unknown>> = {
  columns: AdminTableColumn<T>[];
  data: T[];
};

export function AdminTable<T extends Record<string, unknown>>({ columns, data }: AdminTableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="admin-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          {columns.map((column) => <col key={column.key} style={{ width: `${100 / columns.length}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const value = column.render ? column.render(row) : String(row[column.key] ?? "");
                return <td key={column.key}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
