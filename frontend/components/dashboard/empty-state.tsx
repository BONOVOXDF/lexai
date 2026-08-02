import * as React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

/** Estado vazio reutilizável para listas. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gold/25 bg-muted/25 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gold/20 bg-gold/8 text-gold-dark dark:text-gold-light">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
