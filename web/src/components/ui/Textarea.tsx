import { forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
