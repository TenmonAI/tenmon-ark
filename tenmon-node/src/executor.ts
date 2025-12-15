/**
 * Command Executor
 * 命令実行（robotjs統合）
 */

import robot from "robotjs";

export interface Command {
  type: string;
  message?: string;
  x?: number;
  y?: number;
  text?: string;
  [key: string]: any;
}

/**
 * 命令を実行
 * 
 * @param command 受信した命令
 */
export function executeCommand(command: Command): void {
  if (!command?.type) {
    console.warn("[TENMON-NODE] ⚠️ Command missing type");
    return;
  }

  console.log("[TENMON-NODE] 📨 Command received:", command.type);

  try {
    switch (command.type) {
      case "ping":
        console.log("🟢 TENMON-NODE is alive");
        break;

      case "speak":
        if (command.message) {
          console.log("🗣", command.message);
        } else {
          console.warn("⚠️ 'speak' command missing message");
        }
        break;

      case "log":
        if (command.message) {
          console.log("📝", command.message);
        } else {
          console.warn("⚠️ 'log' command missing message");
        }
        break;

      case "mouse.move":
        if (typeof command.x === "number" && typeof command.y === "number") {
          robot.moveMouse(command.x, command.y);
          console.log(`🖱️ Mouse moved to (${command.x}, ${command.y})`);
        } else {
          console.warn("⚠️ 'mouse.move' command missing x or y");
        }
        break;

      case "mouse.click":
        robot.mouseClick();
        console.log("🖱️ Mouse clicked");
        break;

      case "keyboard.type":
        if (command.text) {
          robot.typeString(command.text);
          console.log(`⌨️ Typed: ${command.text.substring(0, 50)}...`);
        } else {
          console.warn("⚠️ 'keyboard.type' command missing text");
        }
        break;

      default:
        console.warn("⚠️ Unknown command type:", command.type);
    }
  } catch (error) {
    console.error("[TENMON-NODE] ❌ Command execution failed:", error);
  }
}

