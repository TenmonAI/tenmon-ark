/**
 * ============================================================
 *  OFFLINE POLICY PANEL — オフラインポリシーパネル
 * ============================================================
 * 
 * Founder ダッシュボード用のオフラインポリシー表示
 * ============================================================
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle, XCircle } from "lucide-react";

interface OfflinePolicyState {
  isOffline: boolean;
  allowNewPersonaCreation: boolean;
  allowGlobalLawChanges: boolean;
  allowMutations: boolean;
  allowedMutationTypes: string[];
}

interface OfflinePolicyPanelProps {
  policyState?: OfflinePolicyState;
}

export function OfflinePolicyPanel({ policyState }: OfflinePolicyPanelProps) {
  const defaultState: OfflinePolicyState = {
    isOffline: false,
    allowNewPersonaCreation: true,
    allowGlobalLawChanges: true,
    allowMutations: true,
    allowedMutationTypes: ["all"],
  };

  const state = policyState || defaultState;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Offline Policy State
        </CardTitle>
        <CardDescription>
          Founder専用: オフラインポリシーの状態
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Connection Status</p>
            <Badge variant={state.isOffline ? "destructive" : "default"}>
              {state.isOffline ? "Offline" : "Online"}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Policy Rules</p>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">New Persona Creation</span>
              {state.allowNewPersonaCreation ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Global Law Changes</span>
              {state.allowGlobalLawChanges ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Mutations</span>
              {state.allowMutations ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>

          {state.allowMutations && (
            <div>
              <p className="text-sm font-medium mb-2">Allowed Mutation Types</p>
              <div className="flex flex-wrap gap-2">
                {state.allowedMutationTypes.map((type) => (
                  <Badge key={type} variant="outline">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

