import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

export default function BottomSheet({
  open,
  onClose,
  title,
  onBack,
  step,
  steps,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onBack?: () => void;
  step?: number;
  steps?: number;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 animate-sheet-fade bg-slate-900/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md animate-sheet-up flex-col rounded-t-3xl bg-white dark:bg-slate-800 shadow-xl lg:animate-pop-in lg:rounded-2xl lg:shadow-2xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-600 lg:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-7" />
          )}
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {step !== undefined && steps !== undefined && (
          <div className="flex shrink-0 justify-center gap-1.5 pb-2">
            {Array.from({ length: steps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < step ? "w-5 bg-emerald-500" : "w-1.5 bg-slate-200 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
