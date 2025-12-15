/**
 * ============================================================
 *  EMERGENCY STOP PANEL — 即時遮断スイッチ
 * ============================================================
 * 
 * 物理停止思想：どんなロジックより優先
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

  const handleToggle = (type: "all" | "buy" | "sell") => {
    const currentState = emergencyStop?.[type] || false;
    setConfirmType(type);
    setConfirmEnabled(!currentState);
  };

  const confirmToggle = () => {
    if (confirmType) {
      setEmergencyStopMutation.mutate({
        type: confirmType,
        enabled: confirmEnabled,
      });
      setConfirmType(null);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-red-500">
      <h2 className="text-white font-semibold mb-4">⛔ 即時遮断スイッチ</h2>

      <div className="space-y-3">
        <button
          onClick={() => handleToggle("all")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.all
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.all ? "⛔ 全取引停止中" : "全取引停止"}
        </button>

        <button
          onClick={() => handleToggle("buy")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.buy
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.buy ? "⛔ BUY 停止中" : "BUY 停止"}
        </button>

        <button
          onClick={() => handleToggle("sell")}
          className={`w-full px-4 py-3 rounded font-semibold transition-colors ${
            emergencyStop?.sell
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {emergencyStop?.sell ? "⛔ SELL 停止中" : "SELL 停止"}
        </button>
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

