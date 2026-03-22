import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableCardProps<T> = {
  title: string;
  rows: T[];
  columns: Array<Column<T>>;
};

export function DataTableCard<T>({
  title,
  rows,
  columns,
}: DataTableCardProps<T>) {
  return (
    <div className="panel-card data-table-card">
      <div className="panel-card__header">
        <div className="data-table-card__header">
          <h2 className="panel-card__title">{title}</h2>
          <span className="data-table-card__meta">
            {rows.length} {rows.length === 1 ? "fila" : "filas"}
          </span>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 data-table-card__table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
