import i18n from "i18next";
import type { ListVisibility } from "./types";

const t = i18n.t.bind(i18n);

export function getVISIBILITY_OPTIONS() {
  return [
    {
      value: "family" as ListVisibility,
      label: t("visibility.family.label"),
      description: t("visibility.family.description"),
    },
    {
      value: "private" as ListVisibility,
      label: t("visibility.private.label"),
      description: t("visibility.private.description"),
    },
    {
      value: "custom" as ListVisibility,
      label: t("visibility.custom.label"),
      description: t("visibility.custom.description"),
    },
  ];
}

// For backward compatibility
export const VISIBILITY_OPTIONS = getVISIBILITY_OPTIONS();
