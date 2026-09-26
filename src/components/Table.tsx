import type { ReactNode } from "react";

export type TableColumn<T extends object> = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T] | undefined, row: T) => ReactNode;
};

type TableProps<T extends object> = {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
};

export function Table<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  getRowKey = (_, index) => index,
}: TableProps<T>) {
  const minimumWidth = `${columns.length * 120}px`;

  return (
    <div className="table-wrap">
      <table
        className="admin-table"
        style={{ width: "100%", minWidth: `max(100%, ${minimumWidth})`, tableLayout: "fixed" }}
        aria-busy={loading}
      >
        <colgroup>
          {columns.map((column, index) => (
            <col key={`${column.key}-${index}`} style={{ width: `${100 / columns.length}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={`${column.key}-${index}`} scope="col" style={{ textAlign: column.align ?? "left" }}>
                <div className="admin-table-cell-content">{column.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }, (_, rowIndex) => (
              <tr key={`loading-${rowIndex}`} aria-hidden="true">
                {columns.map((column, columnIndex) => (
                  <td key={`${column.key}-${columnIndex}`}>
                    <div className="admin-table-cell-content"><span className="table-skeleton" /></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length ? (
            data.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map((column, columnIndex) => {
                  const value = column.key in row ? row[column.key as keyof T] : undefined;
                  const content = column.render
                    ? column.render(value, row)
                    : value == null || value === ""
                      ? "-"
                      : String(value);

                  return (
                    <td key={`${column.key}-${columnIndex}`} style={{ textAlign: column.align ?? "left" }}>
                      <div className="admin-table-cell-content">{content ?? "-"}</div>
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td className="table-empty" colSpan={Math.max(columns.length, 1)}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}