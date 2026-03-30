type FinanceHelpBubbleProps = {
  helpText: string;
  label: string;
};

export function FinanceHelpBubble({ helpText, label }: FinanceHelpBubbleProps) {
  return (
    <div className="finance-help-bubble">
      <button
        aria-label={label}
        className="finance-help-bubble__trigger"
        type="button"
      >
        ?
      </button>
      <div className="finance-help-bubble__tooltip" role="tooltip">
        {helpText}
      </div>
    </div>
  );
}
