export type OperationalSummaryCard = {
  key: string;
  eyebrow: string;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  title: string;
  detail: string;
};

type OperationalSummaryStripProps = {
  cards: OperationalSummaryCard[];
};

export function OperationalSummaryStrip({
  cards,
}: OperationalSummaryStripProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="ops-summary-strip">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`ops-summary-card ops-summary-card--${card.tone}`}
        >
          <div className="ops-summary-card__eyebrow">{card.eyebrow}</div>
          <div className="ops-summary-card__title">{card.title}</div>
          <div className="ops-summary-card__detail">{card.detail}</div>
        </div>
      ))}
    </div>
  );
}
