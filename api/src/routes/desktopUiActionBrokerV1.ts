/**
 * DESKTOP_UI_ACTION_BROKER_V1
 * Read-only schema / contract — 実デスクトップ操作は行わない（権限つき実行器の定義のみ）。
 */
import type { Request, Response } from "express";

const V = "DESKTOP_UI_ACTION_BROKER_V1";
const NEXT_CARD = "BROWSER_AUTONOMOUS_OPERATOR_V1";

/** GET /api/audit/desktop-ui-action-broker-v1 */
export function handleDesktopUiActionBrokerV1(_req: Request, res: Response): void {
  res.json({
    ok: true,
    v: V,
    timestamp: new Date().toISOString(),
    schemaVersion: 1,
    brokerInput: {
      oneOf: ["ExecutionDispatchV1", "CursorActionDispatchV1"],
      description: "実行 dispatch または Cursor 向け dispatch を入力とする",
    },
    brokerOutput: {
      DesktopActionDispatchV1: {
        actionId: "string",
        dispatchId: "string",
        appTarget: "string",
        windowTarget: "string",
        actionType:
          "focus_window | open_app | copy_text | paste_text | click_run | click_confirm | click_cancel | read_visible_text | capture_screen_state",
        allowedActions: "string[]",
        blockedActions: "string[]",
        requiresHumanApproval: "boolean",
        reviewReason: "string | null",
        expectedVisibleMarkers: "string[]",
        forbiddenVisibleMarkers: "string[]",
        resultCapturePath: "string",
        evidenceBundlePath: "string",
        staleScreenGuard: "boolean",
        retryPolicy: "{ maxRetries: number, backoffMs: number }",
        failClosed: "boolean",
        state: "DesktopUiBrokerState",
      },
    },
    actionTypes: [
      "focus_window",
      "open_app",
      "copy_text",
      "paste_text",
      "click_run",
      "click_confirm",
      "click_cancel",
      "read_visible_text",
      "capture_screen_state",
    ],
    states: [
      "desktop_idle",
      "desktop_targeting",
      "desktop_ready",
      "desktop_waiting_review",
      "desktop_action_running",
      "desktop_result_reading",
      "desktop_done",
      "desktop_failed",
    ],
    rules: {
      highRiskContextClickRunForbidden: true,
      operateOnlyWhenExpectedMarkersPresent: true,
      stopImmediatelyOnForbiddenMarker: true,
      noTouchWillMeaningBeautyScreensReviewRequired: true,
      canPressButtonIsNotPermissionToPress: true,
      failClosedDefault: true,
      ambiguousScreenDoNothing: true,
      evidenceRequiresScreenStateVisibleTextActionLog: true,
      unlimitedAutomationForbidden: true,
    },
    policyNotes: [
      "RUN / CONFIRM / CANCEL は型に含むが、high-risk では自動 click_run を許可しない",
      "visible marker gate: expected 未充足なら操作しない",
      "forbidden 検出で即停止",
    ],
    exampleDesktopActionDispatchV1: {
      actionId: "dui_001",
      dispatchId: "dsp_ark_001",
      appTarget: "Cursor",
      windowTarget: "TENMON-ARK — workspace",
      actionType: "read_visible_text",
      allowedActions: ["focus_window", "read_visible_text", "capture_screen_state", "click_confirm", "click_cancel"],
      blockedActions: ["click_run"],
      requiresHumanApproval: true,
      reviewReason: "high_risk_context: 主幹契約画面の可能性",
      expectedVisibleMarkers: ["[AUDIT]", "build", "PASS"],
      forbiddenVisibleMarkers: ["DROP TABLE", "kokuzo_schema.sql — 直接編集"],
      resultCapturePath: "/tmp/desktop_ui_evidence/result.json",
      evidenceBundlePath: "/tmp/desktop_ui_evidence/bundle",
      staleScreenGuard: true,
      retryPolicy: { maxRetries: 0, backoffMs: 500 },
      failClosed: true,
      state: "desktop_waiting_review",
    },
    nextCard: NEXT_CARD,
  });
}
