/**
 * ============================================================
 *  ERROR STATE — エラー状態UI
 * ============================================================
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  message = "再試行できます",
  onRetry,
  className = "" 
}: ErrorStateProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12" role="alert">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground mb-4">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRetry();
              }
            }}
            tabIndex={0}
            aria-label="再試行"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            再試行
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

