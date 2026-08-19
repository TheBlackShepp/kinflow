import i18n from "i18next";
import type { ListType } from "./types";

const t = i18n.t.bind(i18n);

export function getLIST_TYPES() {
  return [
    {
      value: "shopping" as ListType,
      label: t("listTypes.shopping.label"),
      icon: "🛒",
      description: t("listTypes.shopping.description"),
    },
    {
      value: "todo" as ListType,
      label: t("listTypes.todo.label"),
      icon: "✅",
      description: t("listTypes.todo.description"),
    },
    {
      value: "packing" as ListType,
      label: t("listTypes.packing.label"),
      icon: "🧳",
      description: t("listTypes.packing.description"),
    },
    {
      value: "wishlist" as ListType,
      label: t("listTypes.wishlist.label"),
      icon: "🎁",
      description: t("listTypes.wishlist.description"),
    },
    {
      value: "media" as ListType,
      label: t("listTypes.media.label"),
      icon: "🎬",
      description: t("listTypes.media.description"),
    },
  ];
}

// For backward compatibility - static version (non-translated)
export const LIST_TYPES = getLIST_TYPES();

export const LIST_TYPE_ICON: Record<ListType, string> = {
  shopping: "🛒",
  todo: "✅",
  packing: "🧳",
  wishlist: "🎁",
  media: "🎬",
};

const CATEGORY_KEYS: Record<ListType, string[]> = {
  shopping: ["categories.general", "categories.fruitsVegetables", "categories.dairy", "categories.meatFish", "categories.bakery", "categories.cleaning", "categories.supermarket"],
  todo: [],
  packing: ["categories.documentation", "categories.clothing", "categories.toiletry", "categories.electronics", "categories.medications", "categories.others"],
  wishlist: ["categories.general", "categories.toys", "categories.clothing", "categories.electronics", "categories.books", "categories.home", "categories.sports", "categories.others"],
  media: ["categories.movie", "categories.series", "categories.book"],
};

export function getLIST_TYPE_CATEGORIES(type: ListType): string[] {
  return (CATEGORY_KEYS[type] ?? []).map((key) => t(key));
}

// Static version for backward compatibility
export const LIST_TYPE_CATEGORIES: Record<ListType, string[]> = {
  shopping: CATEGORY_KEYS.shopping.map((key) => t(key)),
  todo: [],
  packing: CATEGORY_KEYS.packing.map((key) => t(key)),
  wishlist: CATEGORY_KEYS.wishlist.map((key) => t(key)),
  media: CATEGORY_KEYS.media.map((key) => t(key)),
};

export const MEDIA_STATUS = [
  t("mediaStatus.pending"),
  t("mediaStatus.inProgress"),
  t("mediaStatus.done"),
] as const;

export const TODO_PRIORITIES = [
  t("todoPriority.high"),
  t("todoPriority.medium"),
  t("todoPriority.low"),
] as const;
