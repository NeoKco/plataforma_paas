import type { ReactNode } from "react";
import { AppTableWrap } from "../../design-system/AppLayout";
import { useLanguage } from "../../store/language-context";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableCardProps<T> = {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: Array<Column<T>>;
  actions?: ReactNode;
};

export function DataTableCard<T>({
  title,
  subtitle,
  rows,
  columns,
  actions,
}: DataTableCardProps<T>) {
  const { language } = useLanguage();

  return (
    <div className="panel-card data-table-card">
      <div className="panel-card__header">
        <div className="data-table-card__header">
          <div>
            <h2 className="panel-card__title">{title}</h2>
            {subtitle ? <p className="panel-card__subtitle mb-0">{subtitle}</p> : null}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {actions}
            <span className="data-table-card__meta">
              {rows.length}{" "}
              {language === "es"
                ? rows.length === 1
                  ? "fila"
                  : "filas"
                : rows.length === 1
                  ? "row"
                  : "rows"}
            </span>
          </div>
        </div>
      </div>
      <AppTableWrap>
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
      </AppTableWrap>
    </div>
  );
}
