import type { FormEventHandler, ReactNode } from "react";

type AppFormProps = {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  className?: string;
};

type AppFormFieldProps = {
  children: ReactNode;
  label?: ReactNode;
  htmlFor?: string;
  fullWidth?: boolean;
  className?: string;
};

type AppFormActionsProps = {
  children: ReactNode;
  className?: string;
};

type AppCheckGridProps = {
  children: ReactNode;
  className?: string;
};

export function AppForm({
  children,
  onSubmit,
  className,
}: AppFormProps) {
  const extraClass = className ? ` ${className}` : "";
  return (
    <form className={`app-form-grid${extraClass}`} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export function AppFormField({
  children,
  label,
  htmlFor,
  fullWidth = false,
  className,
}: AppFormFieldProps) {
  const fullWidthClass = fullWidth ? " app-form-field--full" : "";
  const extraClass = className ? ` ${className}` : "";

  return (
    <div className={`app-form-field${fullWidthClass}${extraClass}`}>
      {label ? (
        <label className="form-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
    </div>
  );
}

export function AppFormActions({
  children,
  className,
}: AppFormActionsProps) {
  const extraClass = className ? ` ${className}` : "";
  return <div className={`app-form-actions${extraClass}`}>{children}</div>;
}

export function AppCheckGrid({
  children,
  className,
}: AppCheckGridProps) {
  const extraClass = className ? ` ${className}` : "";
  return <div className={`app-check-grid${extraClass}`}>{children}</div>;
}
