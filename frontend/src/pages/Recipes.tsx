import { useState } from "react";
import {
  Plus,
  Clock,
  Users,
  Trash2,
  Pencil,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import type { Recipe, Ingredient } from "../lib/types";
import Modal from "../components/Modal";

interface RecipeForm {
  title: string;
  description: string;
  prepTime: string;
  servings: number;
  instructions: string;
  ingredients: { name: string; amount: string; unit: string }[];
}

const emptyForm: RecipeForm = {
  title: "",
  description: "",
  prepTime: "",
  servings: 4,
  instructions: "",
  ingredients: [],
};

export default function Recipes() {
  const { user } = useAuth();
  const { recipes, ready, createRecipe, updateRecipe, deleteRecipe } = useData();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [error, setError] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      title: recipe.title,
      description: recipe.description ?? "",
      prepTime: recipe.prepTime ?? "",
      servings: recipe.servings,
      instructions: recipe.instructions ?? "",
      ingredients: recipe.ingredients.map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
    });
    setError("");
    setOpen(true);
  };

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    const ings = [...form.ingredients];
    ings[i] = { ...ings[i], [field]: value };
    setForm({ ...form, ingredients: ings });
  };

  const addIngredientRow = () => {
    setForm({
      ...form,
      ingredients: [...form.ingredients, { name: "", amount: "1", unit: "" }],
    });
  };

  const removeIngredientRow = (i: number) => {
    setForm({
      ...form,
      ingredients: form.ingredients.filter((_, idx) => idx !== i),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ingredients = form.ingredients.filter((i) => i.name.trim());
    try {
      const data = {
        ...form,
        servings: Number(form.servings) || 4,
        ingredients,
      };
      if (editingId) {
        await updateRecipe(editingId, data);
      } else {
        await createRecipe(data);
      }
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta receta?")) return;
    await deleteRecipe(id);
  };

  if (!user?.familyId) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-700">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <p className="font-medium">Necesitas un hogar para guardar recetas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-100">
        <img
          src="/images/recipes-banner.svg"
          alt="Recetario familiar"
          className="h-36 w-full object-cover sm:h-48"
        />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Recetario familiar</h1>
        <p className="text-sm text-slate-500">Tus recetas guardadas</p>
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : recipes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Aún no hay recetas</p>
          <p className="text-sm text-slate-400">Guarda las recetas favoritas de tu familia</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800">{recipe.title}</h3>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(recipe)}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-600"
                    title="Editar receta"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {recipe.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{recipe.description}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                {recipe.prepTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {recipe.prepTime}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {recipe.servings} pers.
                </span>
                <span>{recipe.ingredients.length} ingred.</span>
              </div>
              <button
                onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
              >
                {expanded === recipe.id ? "Ocultar" : "Ver receta"}
                {expanded === recipe.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expanded === recipe.id && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Ingredientes
                  </h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={ing.id ?? i} className="flex justify-between text-sm">
                        <span className="text-slate-700">{ing.name}</span>
                        <span className="text-slate-400">
                          {ing.amount} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {recipe.instructions && (
                    <>
                      <h4 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Instrucciones
                      </h4>
                      <p className="whitespace-pre-line text-sm text-slate-600">
                        {recipe.instructions}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-600 transition hover:bg-emerald-600 hover:shadow-xl"
        aria-label="Nueva receta"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Editar receta" : "Nueva receta"}>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Lasaña de la abuela"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Breve descripción"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tiempo</label>
              <input
                type="text"
                value={form.prepTime}
                onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                placeholder="45 min"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Porciones</label>
              <input
                type="number"
                min={1}
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Ingredientes</label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
            {form.ingredients.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
                Aún no hay ingredientes. Agrega al menos uno.
              </p>
            ) : (
              <div className="space-y-2">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      placeholder="Ingrediente"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={ing.amount}
                      onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                      placeholder="Cant."
                      className="w-16 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                      placeholder="Unidad"
                      className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(i)}
                      className="rounded-xl px-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Instrucciones</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={4}
              placeholder="Paso a paso..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {editingId ? "Guardar cambios" : "Guardar receta"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
