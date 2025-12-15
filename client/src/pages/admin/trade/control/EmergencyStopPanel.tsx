/**
 * ============================================================
 *  EMERGENCY STOP PANEL — 即時停止（物理スイッチ思想）
 * ============================================================
 * 
 * ボタン:
 * - ⛔ ALL STOP
 * - BUY STOP
 * - SELL STOP
 * 
 * API: tenmonTrade.setEmergencyStop({ mode: "ALL" | "BUY" | "SELL" | "OFF" })
 * 
 * 優先度:
 * - 全ロジックより上位
 * - Decision Engine を強制 STOP
 * ============================================================
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function EmergencyStopPanel() {
  const { data: emergencyStop, refetch } = trpc.adminTrade.getEmergencyStop.useQuery();
  const setEmergencyStopMutation = trpc.adminTrade.setEmergencyStop.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [confirmType, setConfirmType] = useState<"all" | "buy" | "sell" | null>(null);
  const [confirmEnabled, setConfirmEnabled] = useState<boolean>(false);

  const handleToggle = (mode: "ALL" | "BUY" | "SELL" | "OFF") => {
    const currentState = emergencyStop?.[mode.toLowerCase() as "all" | "buy" | "sell"] || false;
    if (mode === "OFF") {
      setConfirmType(null);
      setConfirmEnabled(false);
      setEmergencyStopMutation.mutate({ mode: "OFF" });
      return;
    }
    setConfirmType(mode.toLowerCase() as "all" | "buy" | "sell");
    setConfirmEnabled(!currentState);
  };

  const confirmToggle = () => {
    if (confirmType) {
      const mode = confirmType.toUpperCase() as "ALL" | "BUY" | "SELL";
      setEmergencyStopMutation.mutate({
        mode: confirmEnabled ? mode : "OFF",
      });
      setConfirmType(null);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-red-500">
      <h2 className="text-white font-semibold mb-4">⛔ 即時遮断スイッチ</h2>

      <div className="space-y-3">
        <button
          onClick={() => handleToggle("ALL")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.all
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.all ? "⛔ 全取引停止中" : "全取引停止"}
        </button>

        <button
          onClick={() => handleToggle("BUY")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.buy
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.buy ? "⛔ BUY 停止中" : "BUY 停止"}
        </button>

        <button
          onClick={() => handleToggle("SELL")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.sell
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.sell ? "⛔ SELL 停止中" : "SELL 停止"}
        </button>

        {(emergencyStop?.all || emergencyStop?.buy || emergencyStop?.sell) && (
          <button
            onClick={() => handleToggle("OFF")}
            className="w-full px-4 py-3 rounded font-semibold transition-colors bg-green-600 text-white hover:bg-green-700"
          >
            全停止解除
          </button>
        )}
      </div>

      {/* 確認モーダル */}
      <AlertDialog.Root open={confirmType !== null}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-6 rounded-lg border border-red-500 min-w-[400px]">
            <AlertDialog.Title className="text-xl font-bold mb-4 text-red-500">
              ⛔ 緊急停止確認
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-6">
              {confirmEnabled ? (
                <p>
                  <span className="font-semibold text-red-500">{confirmType?.toUpperCase()}</span>{" "}
                  の取引を停止しますか？
                </p>
              ) : (
                <p>
                  <span className="font-semibold text-green-500">{confirmType?.toUpperCase()}</span>{" "}
                  の取引を再開しますか？
                </p>
              )}
              <p className="text-yellow-400 text-sm mt-2">
                ⚠️ 緊急停止は全ロジックより優先されます
              </p>
            </AlertDialog.Description>
            <div className="flex gap-4 justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={() => setConfirmType(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmToggle}
                  className={`px-4 py-2 rounded text-white font-semibold ${
                    confirmEnabled
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {confirmEnabled ? "停止" : "再開"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

