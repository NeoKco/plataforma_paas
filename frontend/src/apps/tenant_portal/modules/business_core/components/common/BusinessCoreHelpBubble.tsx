import { useId, useState } from "react";

export function BusinessCoreHelpBubble({
  label,
  helpText,
}: {
  label: string;
  helpText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <div className="business-core-help">
      <button
        type="button"
        className="business-core-help__trigger"
        aria-label={label}
        aria-describedby={tooltipId}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((value) => !value)}
      >
        i
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className={`business-core-help__tooltip${isOpen ? " is-open" : ""}`}
      >
        {helpText}
      </div>
    </div>
  );
}
