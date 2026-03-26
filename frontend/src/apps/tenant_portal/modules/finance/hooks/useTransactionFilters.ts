import { useState } from "react";

export function useTransactionFilters<T extends Record<string, unknown>>(initial: T) {
  const [filters, setFilters] = useState(initial);
  return { filters, setFilters };
}
