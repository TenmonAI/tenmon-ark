/**
 * macOS Keyboard Driver
 * キーボード制御
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

import Foundation
import CoreGraphics

/**
 * キーを送信
 */
func sendKey(key: String, modifiers: [String]) {
    // TODO: CGEventPost を使ってキーを送信
    // let event = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true)
    // event?.post(tap: .cghidEventTap)
}

/**
 * テキストを入力
 */
func sendText(text: String) {
    // TODO: CGEventPost を使ってテキストを入力
}

