/**
 * ============================================================
 *  LOADING STATE — 読み込み状態UI
 * ============================================================
 */

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ 
  message = "読み込み中", 
  className = "" 
}: LoadingStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-3" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

