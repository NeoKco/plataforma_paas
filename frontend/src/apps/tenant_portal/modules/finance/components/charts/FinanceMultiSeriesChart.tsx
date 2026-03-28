type FinanceMultiSeriesChartSeries = {
  key: string;
  label: string;
  color: string;
};

type FinanceMultiSeriesChartPoint = {
  label: string;
  values: Record<string, number>;
};

type FinanceMultiSeriesChartProps = {
  points: FinanceMultiSeriesChartPoint[];
  series: FinanceMultiSeriesChartSeries[];
  emptyLabel: string;
};

export function FinanceMultiSeriesChart({
  points,
  series,
  emptyLabel,
}: FinanceMultiSeriesChartProps) {
  if (points.length === 0 || series.length === 0) {
    return <p className="tenant-muted-text mb-0">{emptyLabel}</p>;
  }

  const chartHeight = 220;
  const chartWidth = 100;
  const allValues = points.flatMap((point) =>
    series.map((entry) => point.values[entry.key] ?? 0)
  );
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(0, ...allValues);
  const range = maxValue - minValue || 1;
  const zeroY = mapValueToY(0, minValue, range, chartHeight);
  const gridMarks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="finance-chart-card">
      <div className="finance-chart-card__legend">
        {series.map((entry) => (
          <div key={entry.key} className="finance-chart-card__legend-item">
            <span
              className="finance-chart-card__legend-swatch"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
      <div className="finance-chart-card__canvas">
        <svg
          className="finance-series-chart"
          preserveAspectRatio="none"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {gridMarks.map((mark) => {
            const y = chartHeight * mark;
            return (
              <line
                key={mark}
                className="finance-series-chart__grid"
                x1="0"
                x2={String(chartWidth)}
                y1={String(y)}
                y2={String(y)}
              />
            );
          })}
          <line
            className="finance-series-chart__zero"
            x1="0"
            x2={String(chartWidth)}
            y1={String(zeroY)}
            y2={String(zeroY)}
          />
          {series.map((entry) => {
            const coordinates = buildCoordinates(
              points.map((point) => point.values[entry.key] ?? 0),
              minValue,
              range,
              chartWidth,
              chartHeight
            );

            return (
              <g key={entry.key}>
                <polyline
                  className="finance-series-chart__line"
                  points={coordinates.map(([x, y]) => `${x},${y}`).join(" ")}
                  style={{ color: entry.color }}
                />
                {coordinates.map(([x, y], index) => (
                  <circle
                    key={`${entry.key}-${points[index]?.label ?? index}`}
                    className="finance-series-chart__dot"
                    cx={String(x)}
                    cy={String(y)}
                    r="1.4"
                    style={{ color: entry.color }}
                  />
                ))}
              </g>
            );
          })}
        </svg>
        <div className="finance-series-chart__labels">
          {points.map((point) => (
            <span key={point.label}>{point.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildCoordinates(
  values: number[],
  minValue: number,
  range: number,
  width: number,
  height: number
) {
  const lastIndex = Math.max(values.length - 1, 1);
  return values.map((value, index) => {
    const x = (index / lastIndex) * width;
    const y = mapValueToY(value, minValue, range, height);
    return [x, y] as const;
  });
}

function mapValueToY(
  value: number,
  minValue: number,
  range: number,
  height: number
) {
  return height - ((value - minValue) / range) * height;
}
