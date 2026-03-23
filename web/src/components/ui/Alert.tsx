import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "bg-blue-400/10 text-blue-400 border-l-blue-400",
  success: "bg-teal-400/10 text-teal-400 border-l-teal-400",
  warning: "bg-amber-400/10 text-amber-400 border-l-amber-400",
  error: "bg-red-400/10 text-red-400 border-l-red-400",
};

export function Alert({ variant, children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-xl border-l-4 p-4 text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
