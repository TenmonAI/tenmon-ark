/**
 * ============================================================
 *  LOT CONTROL PANEL — ロット & 複利管理パネル
 * ============================================================
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function LotControlPanel() {
  const { data: lotSettings, refetch } = trpc.adminTrade.getLotSettings.useQuery();
  const updateLotSettingsMutation = trpc.adminTrade.updateLotSettings.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    balance: lotSettings?.balance || 0,
    currentLot: lotSettings?.currentLot || 0.01,
    mode: lotSettings?.mode || "AGGRESSIVE",
    maxLot: lotSettings?.maxLot || 0.1,
    riskPerTrade: lotSettings?.riskPerTrade || 0.3,
  });

  const handleSave = () => {
    updateLotSettingsMutation.mutate(editValues);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">ロット & 複利管理</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
          >
            編集
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditValues({
                  balance: lotSettings?.balance || 0,
                  currentLot: lotSettings?.currentLot || 0.01,
                  mode: lotSettings?.mode || "AGGRESSIVE",
                  maxLot: lotSettings?.maxLot || 0.1,
                  riskPerTrade: lotSettings?.riskPerTrade || 0.3,
                });
              }}
              className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              保存
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">残高:</span>
          {isEditing ? (
            <input
              type="number"
              value={editValues.balance}
              onChange={(e) =>
                setEditValues({ ...editValues, balance: parseFloat(e.target.value) || 0 })
              }
              className="bg-gray-800 text-white px-2 py-1 rounded w-32 text-right"
            />
          ) : (
            <span className="text-white font-semibold">
              {formatCurrency(lotSettings?.balance || 0)}
            </span>
          )}
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">現在ロット:</span>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={editValues.currentLot}
              onChange={(e) =>
                setEditValues({ ...editValues, currentLot: parseFloat(e.target.value) || 0 })
              }
              className="bg-gray-800 text-white px-2 py-1 rounded w-32 text-right"
            />
          ) : (
            <span className="text-white font-semibold">{lotSettings?.currentLot || 0.01}</span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">複利モード:</span>
          {isEditing ? (
            <select
              value={editValues.mode}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  mode: e.target.value as "AGGRESSIVE" | "SAFE",
                })
              }
              className="bg-gray-800 text-white px-2 py-1 rounded"
            >
              <option value="AGGRESSIVE">攻め（&lt;1000万）</option>
              <option value="SAFE">安全（&gt;=1000万）</option>
            </select>
          ) : (
            <span className="text-white font-semibold">
              {lotSettings?.mode === "AGGRESSIVE" ? "攻め（<1000万）" : "安全（>=1000万）"}
            </span>
          )}
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">最大許可ロット:</span>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={editValues.maxLot}
              onChange={(e) =>
                setEditValues({ ...editValues, maxLot: parseFloat(e.target.value) || 0 })
              }
              className="bg-gray-800 text-white px-2 py-1 rounded w-32 text-right"
            />
          ) : (
            <span className="text-white font-semibold">{lotSettings?.maxLot || 0.1}</span>
          )}
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">リスク/取引:</span>
          {isEditing ? (
            <input
              type="number"
              step="0.1"
              value={editValues.riskPerTrade}
              onChange={(e) =>
                setEditValues({ ...editValues, riskPerTrade: parseFloat(e.target.value) || 0 })
              }
              className="bg-gray-800 text-white px-2 py-1 rounded w-32 text-right"
            />
          ) : (
            <span className="text-white font-semibold">
              {lotSettings?.riskPerTrade || 0.3}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

