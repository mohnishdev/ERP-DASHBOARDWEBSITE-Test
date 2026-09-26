import type { ReactNode } from "react";
import { Table, type TableColumn } from "@/components/Table";

type AdminTableColumn<T extends Record<string, unknown>> = Omit<TableColumn<T>, "render"> & {
  key: keyof T & string;
  render?: (row: T) => ReactNode;
};

type AdminTableProps<T extends Record<string, unknown>> = {
  columns: AdminTableColumn<T>[];
  data: T[];
};

export function AdminTable<T extends Record<string, unknown>>({ columns, data }: AdminTableProps<T>) {
  const compatibleColumns: TableColumn<T>[] = columns.map((column) => ({
    key: column.key,
    label: column.label,
    align: column.align,
    render: column.render ? (_, row) => column.render?.(row) : undefined,
  }));

  return <Table columns={compatibleColumns} data={data} />;
}
