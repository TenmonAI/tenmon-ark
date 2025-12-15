/**
 * Windows Keyboard Driver
 * SendInputでキーボード制御
 * 
 * TENMON-ARK DeviceCluster OS v3 Native Agent
 */

using System;
using System.Runtime.InteropServices;

public class KeyboardDriver
{
    [DllImport("user32.dll")]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    /**
     * キーを送信
     */
    public static void SendKey(string key, string[] modifiers)
    {
        // TODO: SendInput を使ってキーを送信
    }

    /**
     * テキストを入力
     */
    public static void SendText(string text)
    {
        // TODO: SendInput を使ってテキストを入力
    }
}

