import type { ListVisibility } from "./types";

export const VISIBILITY_OPTIONS: {
  value: ListVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "family",
    label: "Todos",
    description: "Visible para toda la familia",
  },
  {
    value: "private",
    label: "Solo yo",
    description: "Solo tú puedes verla y editarla",
  },
  {
    value: "custom",
    label: "Personas concretas",
    description: "Elige quién la ve",
  },
];
