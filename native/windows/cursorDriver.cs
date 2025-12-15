/**
 * Windows Cursor Driver
 * カーソル制御（user32.dll）
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

using System;
using System.Runtime.InteropServices;

public class CursorDriver
{
    [DllImport("user32.dll")]
    static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    /**
     * カーソルを移動
     */
    public static void MoveCursor(int x, int y)
    {
        // TODO: SetCursorPos を使ってカーソルを移動
        // SetCursorPos(x, y);
    }

    /**
     * クリックを実行
     */
    public static void ClickMouse(string button, int x, int y)
    {
        // TODO: mouse_event を使ってクリックを実行
        // SetCursorPos(x, y);
        // mouse_event(0x0002, 0, 0, 0, 0); // MOUSEEVENTF_LEFTDOWN
        // mouse_event(0x0004, 0, 0, 0, 0); // MOUSEEVENTF_LEFTUP
    }
}

