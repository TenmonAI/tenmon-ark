/**
 * ============================================================
 *  EMPTY STATE — 空状態UI
 * ============================================================
 */

import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({ 
  title = "まだ構造がありません",
  description,
  className = "" 
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12" role="status">
        <Inbox className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

