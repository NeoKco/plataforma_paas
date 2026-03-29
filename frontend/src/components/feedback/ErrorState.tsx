import { useLanguage } from "../../store/language-context";

type ErrorStateProps = {
  title?: string;
  detail: string;
  requestId?: string | null;
};

export function ErrorState({
  title,
  detail,
  requestId,
}: ErrorStateProps) {
  const { language } = useLanguage();
  const resolvedTitle =
    title || (language === "es" ? "La solicitud falló" : "The request failed");

  return (
    <div className="rounded-3 border border-danger-subtle bg-danger-subtle p-4">
      <h3 className="h6 text-danger-emphasis">{resolvedTitle}</h3>
      <p className="mb-0 text-danger-emphasis">{detail}</p>
      {requestId ? (
        <p className="mb-0 mt-2 small text-danger-emphasis">
          request_id: <code>{requestId}</code>
        </p>
      ) : null}
    </div>
  );
}
