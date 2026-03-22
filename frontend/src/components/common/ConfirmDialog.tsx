type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  tone?: "warning" | "danger";
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  details = [],
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  isSubmitting = false,
  tone = "warning",
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`confirm-dialog__tone confirm-dialog__tone--${tone}`}>
          Revisión previa
        </div>
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p className="confirm-dialog__description">{description}</p>
        {details.length > 0 ? (
          <ul className="confirm-dialog__details">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <div className="confirm-dialog__actions">
          <button
            className="btn btn-outline-primary"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
