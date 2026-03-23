type BadgeVariant = "green" | "red" | "blue" | "amber" | "zinc" | "teal" | "emerald";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-green-400/10 text-green-400 border-green-400/20",
  red: "bg-red-400/10 text-red-400 border-red-400/20",
  blue: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  amber: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  zinc: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  teal: "bg-teal-400/10 text-teal-400 border-teal-400/20",
  emerald: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
