//+------------------------------------------------------------------+
//|                                          MT5DataSender.mq5       |
//|                        TENMON-ARK MT5 Data Sender                |
//|                        M1 確定時のみ送信                          |
//+------------------------------------------------------------------+
#property copyright "TENMON-ARK"
#property link      ""
#property version   "1.00"
#property strict

#include <Zmq/Zmq.mqh>

CZmqSocket push;

datetime lastMinute = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // ZeroMQ Push を作成
   push.Create(ZMQ_PUSH);
   
   // TENMON-ARK の IP アドレスに接続（環境変数または設定から取得）
   string tenmonIP = "TENMON_IP"; // 実際の IP に置き換える
   push.Connect(StringFormat("tcp://%s:5556", tenmonIP));
   
   Print("[MT5DataSender] Connected to TENMON-ARK at ", tenmonIP);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   push.Close();
   Print("[MT5DataSender] Disconnected from TENMON-ARK");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // M1 確定時のみ送信
   datetime currentMinute = iTime(Symbol(), PERIOD_M1, 0);
   
   if(currentMinute != lastMinute)
   {
      lastMinute = currentMinute;
      
      // 最新 50 本の M1 ローソク足を取得
      int candles = 50;
      double open[], high[], low[], close[];
      long volume[];
      datetime time[];
      
      ArraySetAsSeries(open, true);
      ArraySetAsSeries(high, true);
      ArraySetAsSeries(low, true);
      ArraySetAsSeries(close, true);
      ArraySetAsSeries(volume, true);
      ArraySetAsSeries(time, true);
      
      CopyOpen(Symbol(), PERIOD_M1, 0, candles, open);
      CopyHigh(Symbol(), PERIOD_M1, 0, candles, high);
      CopyLow(Symbol(), PERIOD_M1, 0, candles, low);
      CopyClose(Symbol(), PERIOD_M1, 0, candles, close);
      CopyTickVolume(Symbol(), PERIOD_M1, 0, candles, volume);
      CopyTime(Symbol(), PERIOD_M1, 0, candles, time);
      
      // JSON 形式で送信
      string json = BuildJSON(candles, open, high, low, close, volume, time);
      
      push.Send(json);
      
      Print("[MT5DataSender] Sent ", candles, " candles to TENMON-ARK");
   }
}

//+------------------------------------------------------------------+
//| JSON を構築                                                      |
//+------------------------------------------------------------------+
string BuildJSON(int count, double &open[], double &high[], double &low[], double &close[], long &volume[], datetime &time[])
{
   string json = "{";
   json += "\"symbol\":\"" + Symbol() + "\",";
   json += "\"candles\":[";
   
   for(int i = 0; i < count; i++)
   {
      if(i > 0) json += ",";
      json += "{";
      json += "\"time\":" + IntegerToString((int)time[i]) + ",";
      json += "\"open\":" + DoubleToString(open[i], 5) + ",";
      json += "\"high\":" + DoubleToString(high[i], 5) + ",";
      json += "\"low\":" + DoubleToString(low[i], 5) + ",";
      json += "\"close\":" + DoubleToString(close[i], 5) + ",";
      json += "\"volume\":" + IntegerToString(volume[i]);
      json += "}";
   }
   
   json += "]";
   json += "}";
   
   return json;
}

