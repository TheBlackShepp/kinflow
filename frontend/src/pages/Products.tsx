import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Store,
  Tag,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { useData } from "../lib/store";
import { LIST_TYPE_CATEGORIES } from "../lib/listTypes";
import type { Product } from "../lib/types";

const SHOPPING_CATEGORIES = LIST_TYPE_CATEGORIES.shopping;
const UNITS = ["u", "kg", "g", "l", "ml", "paq", "docena"];

export default function Products() {
  const { t } = useTranslation();

  const {
    products,
    supermarkets,
    ready,
    createProduct,
    updateProduct,
    deleteProduct,
    createSupermarket,
    deleteSupermarket,
    addProductPrice,
    deleteProductPrice,
  } = useData();

  const [tab, setTab] = useState<"products" | "supermarkets">("products");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formUnit, setFormUnit] = useState("u");

  const [newSupermarket, setNewSupermarket] = useState("");

  const [priceProductId, setPriceProductId] = useState<string | null>(null);
  const [priceSupermarketId, setPriceSupermarketId] = useState("");
  const [priceValue, setPriceValue] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const cat = p.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const resetForm = () => {
    setFormName("");
    setFormCategory("General");
    setFormUnit("u");
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    if (editing) {
      await updateProduct(editing.id, {
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
      });
    } else {
      await createProduct({
        name: formName.trim(),
        category: formCategory,
        unit: formUnit,
      });
    }
    resetForm();
  };

  const handleAddSupermarket = async () => {
    if (!newSupermarket.trim()) return;
    await createSupermarket(newSupermarket.trim());
    setNewSupermarket("");
  };

  const handleAddPrice = async () => {
    if (!priceProductId || !priceSupermarketId || !priceValue.trim()) return;
    await addProductPrice(priceProductId, priceSupermarketId, priceValue.trim());
    setPriceProductId(null);
    setPriceSupermarketId("");
    setPriceValue("");
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("products.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-2xl sm:ring-1 sm:ring-slate-100 dark:sm:ring-slate-700">
        <img
          src="/images/products-banner.svg"
          alt={t("products.bannerAlt")}
          className="h-56 w-full object-cover sm:h-64"
        />
        <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow-md sm:bottom-6 sm:left-8 sm:text-3xl">
          {t("products.title")}
        </h1>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-700/50 p-1">
        <button
          onClick={() => setTab("products")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "products"
              ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Package className="mr-1.5 inline h-4 w-4" />
          {t("products.tabProducts")}
        </button>
        <button
          onClick={() => setTab("supermarkets")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "supermarkets"
              ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Store className="mr-1.5 inline h-4 w-4" />
          {t("products.tabSupermarkets")}
        </button>
      </div>

      {tab === "products" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("products.searchPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-emerald-800"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:border-emerald-300 hover:text-emerald-600"
          >
            <Plus className="h-4 w-4" />
            {t("products.newProduct")}
          </button>

          {showForm && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {editing ? t("products.editProduct") : t("products.newProduct")}
                </h3>
                <button onClick={resetForm}>
                  <X className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("products.namePlaceholder")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:bg-slate-700 dark:text-slate-100"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("products.category")}
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {SHOPPING_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("products.unit")}
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!formName.trim()}
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {editing ? t("products.saveChanges") : t("products.createProduct")}
                </button>
              </div>
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                {search ? t("products.noProductsSearch") : t("products.noProducts")}
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {search
                  ? t("products.tryOtherSearch")
                  : t("products.createFirst")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(([cat, items]) => (
                <section
                  key={cat}
                  className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
                >
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <Tag className="h-3 w-3" />
                    {cat}
                    <span className="ml-auto text-[10px] normal-case">
                      {items.length}
                    </span>
                  </h3>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((product) => (
                      <li key={product.id} className="py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {product.unit}
                              {supermarkets.length > 0 &&
                                product.prices &&
                                product.prices.length > 0 &&
                                ` · ${product.prices[0].price}€ (${product.prices[0].supermarket?.name ?? "?"})`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === product.id ? null : product.id
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              {expandedId === product.id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openEdit(product)}
                              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    t("products.confirmDelete", { name: product.name })
                                  )
                                ) {
                                  deleteProduct(product.id);
                                }
                              }}
                              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {expandedId === product.id && (
                          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 p-3">
                            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {t("products.pricesBySupermarket")}
                            </p>
                            {product.prices && product.prices.length > 0 ? (
                              <ul className="mb-2 space-y-1">
                                {product.prices.map((pp) => (
                                  <li
                                    key={pp.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {pp.supermarket?.name ?? "—"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-800 dark:text-slate-100">
                                        {pp.price}€
                                      </span>
                                      <button
                                        onClick={() => deleteProductPrice(pp.id)}
                                        className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-red-500"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
                                {t("products.noPrices")}
                              </p>
                            )}
                            {supermarkets.length > 0 && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={priceProductId === product.id ? priceSupermarketId : ""}
                                  onChange={(e) => {
                                    setPriceProductId(product.id);
                                    setPriceSupermarketId(e.target.value);
                                  }}
                                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs outline-none dark:bg-slate-700 dark:text-slate-100"
                                >
                                  <option value="">{t("products.supermarketPlaceholder")}</option>
                                  {supermarkets.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={priceProductId === product.id ? priceValue : ""}
                                  onChange={(e) => {
                                    setPriceProductId(product.id);
                                    setPriceValue(e.target.value);
                                  }}
                                  placeholder={t("products.pricePlaceholder")}
                                  className="w-20 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs outline-none dark:bg-slate-700 dark:text-slate-100"
                                />
                                <button
                                  onClick={handleAddPrice}
                                  disabled={
                                    priceProductId !== product.id ||
                                    !priceSupermarketId ||
                                    !priceValue.trim()
                                  }
                                  className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "supermarkets" && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSupermarket}
              onChange={(e) => setNewSupermarket(e.target.value)}
              placeholder={t("products.newSupermarket")}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:bg-slate-800 dark:text-slate-100"
              onKeyDown={(e) => e.key === "Enter" && handleAddSupermarket()}
            />
            <button
              onClick={handleAddSupermarket}
              disabled={!newSupermarket.trim()}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {supermarkets.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 py-12 text-center">
              <Store className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                {t("products.noSupermarkets")}
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {t("products.addSupermarkets")}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {supermarkets.map((s) => {
                  const count = products.filter((p) =>
                    p.prices?.some((pr) => pr.supermarketId === s.id)
                  ).length;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {s.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {count === 1
                            ? t("products.productWithPrice", { count })
                            : t("products.productWithPricePlural", { count })}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              t("products.confirmDelete", { name: s.name })
                            )
                          ) {
                            deleteSupermarket(s.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
