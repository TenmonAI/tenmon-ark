/**
 * Android File Tunnel
 * 外部ストレージ read/write
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

package com.tenmonark.devicecluster

import android.content.Context
import java.io.File

class FileTunnel(private val context: Context) {
    /**
     * ファイルを送信
     */
    fun sendFile(filePath: String, targetDeviceId: String) {
        // TODO: 外部ストレージからファイルを読み込んで送信
    }

    /**
     * ファイルを受信
     */
    fun receiveFile(filePath: String) {
        // TODO: ファイルを受信して外部ストレージに保存
    }
}

