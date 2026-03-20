import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  success: "bg-green-400/10 text-green-400 border-green-400/20",
  warning: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  error: "bg-red-400/10 text-red-400 border-red-400/20",
};

export function Alert({ variant, children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
