import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { canWriteModule } from "../lib/permissions";
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { recipes, ready, createRecipe, updateRecipe, deleteRecipe } = useData();
  const canWrite = canWriteModule(user, "recipes");
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
    if (!confirm(t("recipes.confirmDelete"))) return;
    await deleteRecipe(id);
  };

  if (!user?.familyId) {
    return (
      <div className="rounded-2xl bg-amber-50 p-6 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <p className="font-medium">{t("recipes.needsHome")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl sm:ring-1 sm:ring-slate-100 dark:sm:ring-slate-700">
        <img
          src="/images/recipes-banner.svg"
          alt={t("recipes.bannerAlt")}
          className="h-56 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
          {t("recipes.title")}
        </h1>
      </div>

      {!ready ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("app.loading")}</p>
      ) : recipes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-600">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
          <p className="font-medium text-slate-600 dark:text-slate-300">{t("recipes.empty")}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("recipes.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-800 dark:ring-slate-700"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{recipe.title}</h3>
                <div className="flex shrink-0 items-center gap-1">
                  {canWrite && (
                    <>
                  <button
                    onClick={() => openEdit(recipe)}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                    title={t("recipes.editRecipe")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                    </>
                  )}
                </div>
              </div>
              {recipe.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{recipe.description}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                {recipe.prepTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {recipe.prepTime}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {t("recipes.servings", { count: recipe.servings })}
                </span>
                <span>{t("recipes.ingredients", { count: recipe.ingredients.length })}</span>
              </div>
              <button
                onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                className="mt-4 flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {expanded === recipe.id ? t("recipes.hideRecipe") : t("recipes.viewRecipe")}
                {expanded === recipe.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expanded === recipe.id && (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {t("recipes.ingredientsTitle")}
                  </h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={ing.id ?? i} className="flex justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-200">{ing.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {ing.amount} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {recipe.instructions && (
                    <>
                      <h4 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {t("recipes.instructionsTitle")}
                      </h4>
                      <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
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

      {canWrite && (
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-600 transition hover:bg-emerald-600 hover:shadow-xl"
        aria-label={t("recipes.newRecipe")}
      >
        <Plus className="h-7 w-7" />
      </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? t("recipes.editRecipe") : t("recipes.newRecipe")}>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.title")}</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("recipes.titlePlaceholder")}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.description")}</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("recipes.descriptionPlaceholder")}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.time")}</label>
              <input
                type="text"
                value={form.prepTime}
                onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                placeholder={t("recipes.timePlaceholder")}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.servingsLabel")}</label>
              <input
                type="number"
                min={1}
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.ingredientsTitle")}</label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                <Plus className="h-4 w-4" /> {t("recipes.addIngredient")}
              </button>
            </div>
            {form.ingredients.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400 dark:bg-slate-700/30 dark:text-slate-500">
                {t("recipes.noIngredients")}
              </p>
            ) : (
              <div className="space-y-2">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      placeholder={t("recipes.ingredientPlaceholder")}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={ing.amount}
                      onChange={(e) => updateIngredient(i, "amount", e.target.value)}
                      placeholder={t("recipes.amountPlaceholder")}
                      className="w-16 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                      placeholder={t("recipes.unitPlaceholder")}
                      className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(i)}
                      className="rounded-xl px-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{t("recipes.instructionsTitle")}</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              rows={4}
              placeholder={t("recipes.instructionsPlaceholder")}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {editingId ? t("recipes.saveChanges") : t("recipes.saveRecipe")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
