export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-[--color-surface-2] rounded-lg ${className}`} />;
}
