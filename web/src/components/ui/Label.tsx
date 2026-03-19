export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`text-sm text-zinc-400 font-medium ${className}`} {...props} />
  );
}
