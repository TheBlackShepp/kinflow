import { Check, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPasswordRequirements } from "../lib/password";

export default function PasswordRequirements({ password, id }: { password: string; id: string }) {
  const { t } = useTranslation();

  return (
    <ul id={id} aria-live="polite" className="mt-2 space-y-1">
      {getPasswordRequirements(password).map((requirement) => (
        <li
          key={requirement.key}
          data-met={requirement.met}
          className={`flex items-center gap-1.5 text-xs ${
            requirement.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {requirement.met ? (
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {t(`auth.register.${requirement.key}`)}
        </li>
      ))}
    </ul>
  );
}
