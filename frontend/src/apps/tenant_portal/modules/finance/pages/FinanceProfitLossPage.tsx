import { FinancePlaceholderPage } from "../components/common/FinancePlaceholderPage";
import { useLanguage } from "../../../../../store/language-context";

export function FinanceProfitLossPage() {
  const { language } = useLanguage();

  return (
    <FinancePlaceholderPage
      title={language === "es" ? "Estado de resultados" : "Profit & Loss"}
      description={
        language === "es"
          ? "Estado de resultados y lectura de rentabilidad del tenant."
          : "Profit and loss statement and profitability view for the tenant."
      }
    />
  );
}
