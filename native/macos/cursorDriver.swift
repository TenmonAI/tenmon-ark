/**
 * macOS Cursor Driver
 * カーソル制御（CGEventPost）
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

import Foundation
import CoreGraphics

/**
 * カーソルを移動
 */
func moveCursor(x: Double, y: Double) {
    // TODO: CGEventPost を使ってカーソルを移動
    // let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    // event?.post(tap: .cghidEventTap)
}

/**
 * クリックを実行
 */
func clickMouse(button: String, x: Double, y: Double) {
    // TODO: CGEventPost を使ってクリックを実行
    // let event = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    // event?.post(tap: .cghidEventTap)
}

