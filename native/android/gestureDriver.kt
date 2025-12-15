/**
 * Android Gesture Driver
 * ジェスチャー制御
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

package com.tenmonark.devicecluster

import android.accessibilityservice.AccessibilityService
import android.graphics.Path

class GestureDriver(private val accessibilityService: AccessibilityService) {
    /**
     * ジェスチャーを実行
     */
    fun performGesture(path: Path) {
        // TODO: AccessibilityService を使ってジェスチャーを実行
    }
}

