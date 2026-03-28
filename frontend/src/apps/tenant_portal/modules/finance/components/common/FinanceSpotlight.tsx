import type { ReactNode } from "react";
import { AppSpotlight } from "../../../../../../design-system/AppSpotlight";
import type { FinanceIconName } from "./FinanceIcon";

type FinanceSpotlightStat = {
  label: string;
  value: ReactNode;
};

type FinanceSpotlightProps = {
  icon: FinanceIconName;
  eyebrow?: string;
  title: string;
  description: string;
  stats?: FinanceSpotlightStat[];
};

export function FinanceSpotlight({
  icon,
  eyebrow,
  title,
  description,
  stats = [],
}: FinanceSpotlightProps) {
  return (
    <AppSpotlight
      description={description}
      eyebrow={eyebrow}
      icon={icon}
      stats={stats}
      title={title}
    />
  );
}
