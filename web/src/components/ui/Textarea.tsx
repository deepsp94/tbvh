import { forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full bg-[--color-surface-1] border border-[--color-border] rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 resize-none transition-colors ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
