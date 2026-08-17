import type { ListType } from "./types";

export const LIST_TYPES: {
  value: ListType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "shopping",
    label: "Compra",
    icon: "🛒",
    description: "Cantidad, precio y categorías",
  },
  {
    value: "todo",
    label: "Tareas",
    icon: "✅",
    description: "Asignado, prioridad y fecha",
  },
  {
    value: "packing",
    label: "Viaje / Equipaje",
    icon: "🧳",
    description: "Checklist organizada por categorías",
  },
  {
    value: "wishlist",
    label: "Regalos / Deseos",
    icon: "🎁",
    description: "Con precio e historial",
  },
  {
    value: "media",
    label: "Películas / Series / Libros",
    icon: "🎬",
    description: "Pendiente, en curso o hecho",
  },
];

export const LIST_TYPE_ICON: Record<ListType, string> = {
  shopping: "🛒",
  todo: "✅",
  packing: "🧳",
  wishlist: "🎁",
  media: "🎬",
};

export const LIST_TYPE_CATEGORIES: Record<ListType, string[]> = {
  shopping: [
    "General",
    "Frutas y Verduras",
    "Lácteos",
    "Carnes y Pescados",
    "Panadería",
    "Limpieza",
    "Supermercado",
  ],
  todo: [],
  packing: ["Documentación", "Ropa", "Aseo", "Electrónica", "Medicamentos", "Otros"],
  wishlist: ["General", "Juguetes", "Ropa", "Electrónica", "Libros", "Hogar", "Deporte", "Otros"],
  media: ["Película", "Serie", "Libro"],
};

export const MEDIA_STATUS = ["pendiente", "en curso", "hecho"] as const;

export const TODO_PRIORITIES = ["alta", "media", "baja"] as const;
