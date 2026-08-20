import type { ReactNode } from "react";
import { Home } from "lucide-react";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-900 dark:from-emerald-700 dark:via-teal-800 dark:to-slate-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kinflow</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}
