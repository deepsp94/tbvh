import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
