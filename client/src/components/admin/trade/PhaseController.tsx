/**
 * ============================================================
 *  PHASE CONTROLLER — フェーズ制御コンポーネント
 * ============================================================
 * 
 * T-1 / T-2 / T-3 を切り替え
 * ============================================================
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

type Phase = "T-1" | "T-2" | "T-3";

export function PhaseController() {
  const { data: phaseData, refetch } = trpc.adminTrade.getPhase.useQuery();
  const setPhaseMutation = trpc.adminTrade.setPhase.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [confirmPhase, setConfirmPhase] = useState<Phase | null>(null);
  const [doubleConfirmPhase, setDoubleConfirmPhase] = useState<Phase | null>(null);

  const currentPhase = phaseData?.phase || "T-1";

  const handlePhaseChange = (newPhase: Phase) => {
    if (newPhase === "T-3") {
      // T-3 は二重確認必須
      setDoubleConfirmPhase(newPhase);
    } else {
      setConfirmPhase(newPhase);
    }
  };

  const confirmChange = () => {
    if (confirmPhase) {
      setPhaseMutation.mutate({ phase: confirmPhase });
      setConfirmPhase(null);
    }
  };

  const doubleConfirmChange = () => {
    if (doubleConfirmPhase) {
      setPhaseMutation.mutate({ phase: doubleConfirmPhase });
      setDoubleConfirmPhase(null);
      setConfirmPhase(null);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h2 className="text-white font-semibold mb-4">フェーズ制御</h2>

      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="phase"
            value="T-1"
            checked={currentPhase === "T-1"}
            onChange={() => handlePhaseChange("T-1")}
            className="w-4 h-4 text-red-500"
          />
          <span className="text-white">
            <span className="font-semibold">T-1</span> 観測のみ（注文禁止）
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="phase"
            value="T-2"
            checked={currentPhase === "T-2"}
            onChange={() => handlePhaseChange("T-2")}
            className="w-4 h-4 text-red-500"
          />
          <span className="text-white">
            <span className="font-semibold">T-2</span> 提案（人間判断）
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="phase"
            value="T-3"
            checked={currentPhase === "T-3"}
            onChange={() => handlePhaseChange("T-3")}
            className="w-4 h-4 text-red-500"
          />
          <span className="text-white">
            <span className="font-semibold">T-3</span> 限定自動（極小ロット）
          </span>
        </label>
      </div>

      {/* 確認モーダル（T-1, T-2） */}
      <AlertDialog.Root open={confirmPhase !== null}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-6 rounded-lg border border-red-500 min-w-[400px]">
            <AlertDialog.Title className="text-xl font-bold mb-4">
              フェーズ変更確認
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-6">
              フェーズを <span className="font-semibold text-red-500">{confirmPhase}</span> に変更しますか？
            </AlertDialog.Description>
            <div className="flex gap-4 justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={() => setConfirmPhase(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={confirmChange}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  変更
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* 二重確認モーダル（T-3） */}
      <AlertDialog.Root open={doubleConfirmPhase !== null}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-6 rounded-lg border border-red-500 min-w-[400px]">
            <AlertDialog.Title className="text-xl font-bold mb-4 text-red-500">
              ⚠️ 二重確認が必要です
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-6">
              <p className="mb-4">
                フェーズ <span className="font-semibold text-red-500">T-3</span> は自動取引を実行します。
              </p>
              <p className="text-yellow-400">
                本当に変更しますか？
              </p>
            </AlertDialog.Description>
            <div className="flex gap-4 justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={() => {
                    setDoubleConfirmPhase(null);
                    setConfirmPhase(null);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={doubleConfirmChange}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                >
                  変更を確定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

