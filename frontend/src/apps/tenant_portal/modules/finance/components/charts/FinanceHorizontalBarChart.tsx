type FinanceHorizontalBarItem = {
  label: string;
  value: number;
  caption?: string;
};

type FinanceHorizontalBarChartProps = {
  items: FinanceHorizontalBarItem[];
  emptyLabel: string;
  formatValue: (value: number) => string;
};

export function FinanceHorizontalBarChart({
  items,
  emptyLabel,
  formatValue,
}: FinanceHorizontalBarChartProps) {
  if (items.length === 0) {
    return <p className="tenant-muted-text mb-0">{emptyLabel}</p>;
  }

  const maxAbsValue =
    items.reduce((maxValue, item) => Math.max(maxValue, Math.abs(item.value)), 0) || 1;

  return (
    <div className="finance-bar-chart">
      {items.map((item) => {
        const width = `${(Math.abs(item.value) / maxAbsValue) * 100}%`;
        const toneClass = item.value >= 0 ? "is-positive" : "is-negative";
        return (
          <div key={`${item.label}-${item.caption ?? ""}`} className="finance-bar-chart__row">
            <div className="finance-bar-chart__meta">
              <div className="finance-bar-chart__label">{item.label}</div>
              {item.caption ? (
                <div className="finance-bar-chart__caption">{item.caption}</div>
              ) : null}
            </div>
            <div className="finance-bar-chart__track">
              <div
                className={`finance-bar-chart__fill ${toneClass}`}
                style={{ width }}
              />
            </div>
            <div className={`finance-bar-chart__value ${toneClass}`}>
              {formatValue(item.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
