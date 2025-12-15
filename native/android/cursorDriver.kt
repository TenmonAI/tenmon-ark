/**
 * Android Cursor Driver
 * AccessibilityServiceでカーソル擬似制御
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

package com.tenmonark.devicecluster

import android.accessibilityservice.AccessibilityService

class CursorDriver(private val accessibilityService: AccessibilityService) {
    /**
     * カーソルを移動（擬似制御）
     */
    fun moveCursor(x: Float, y: Float) {
        // TODO: AccessibilityService を使ってカーソルを移動
    }

    /**
     * クリックを実行（擬似制御）
     */
    fun clickMouse(button: String, x: Float, y: Float) {
        // TODO: AccessibilityService を使ってクリックを実行
    }
}

