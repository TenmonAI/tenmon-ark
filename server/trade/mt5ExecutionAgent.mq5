//+------------------------------------------------------------------+
//|                                          TenmonExecAgent.mq5     |
//|                        TENMON-ARK MT5 Execution Agent            |
//|                        実行専用（ロジック一切なし）                |
//+------------------------------------------------------------------+
#property copyright "TENMON-ARK"
#property link      ""
#property version   "1.00"
#property strict

#include <Zmq/Zmq.mqh>

CZmqSocket sub;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // ZeroMQ Subscriber を作成
   sub.Create(ZMQ_SUB);
   
   // TENMON-ARK の IP アドレスに接続（環境変数または設定から取得）
   string tenmonIP = "TENMON_IP"; // 実際の IP に置き換える
   sub.Connect(StringFormat("tcp://%s:5555", tenmonIP));
   sub.Subscribe(""); // すべてのメッセージを購読
   
   Print("[TenmonExecAgent] Connected to TENMON-ARK at ", tenmonIP);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   sub.Close();
   Print("[TenmonExecAgent] Disconnected from TENMON-ARK");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   string msg;
   
   // ZeroMQ からメッセージを受信
   if(sub.Recv(msg, ZMQ_DONTWAIT))
   {
      // JSON をパース（簡易版）
      // 実際の実装では JSON パーサーを使用
      
      if(StringFind(msg, "EXECUTE_BUY") >= 0)
      {
         // BUY 注文を実行
         ExecuteBuy();
      }
      else if(StringFind(msg, "EXECUTE_SELL") >= 0)
      {
         // SELL 注文を実行
         ExecuteSell();
      }
      else if(StringFind(msg, "STOP") >= 0)
      {
         // すべてのポジションを閉じる
         CloseAll();
      }
   }
}

//+------------------------------------------------------------------+
//| BUY 注文を実行                                                   |
//+------------------------------------------------------------------+
void ExecuteBuy()
{
   double lot = 0.01; // 極小ロット（Phase T-3）
   double price = Ask;
   int slippage = 3;
   double stopLoss = 0;
   double takeProfit = 0;
   string comment = "TENMON-ARK";
   int magic = 123456;
   datetime expiration = 0;
   color arrowColor = clrGreen;
   
   int ticket = OrderSend(
      Symbol(),
      OP_BUY,
      lot,
      price,
      slippage,
      stopLoss,
      takeProfit,
      comment,
      magic,
      expiration,
      arrowColor
   );
   
   if(ticket > 0)
   {
      Print("[TenmonExecAgent] BUY order executed: ticket=", ticket);
   }
   else
   {
      Print("[TenmonExecAgent] BUY order failed: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| SELL 注文を実行                                                  |
//+------------------------------------------------------------------+
void ExecuteSell()
{
   double lot = 0.01; // 極小ロット（Phase T-3）
   double price = Bid;
   int slippage = 3;
   double stopLoss = 0;
   double takeProfit = 0;
   string comment = "TENMON-ARK";
   int magic = 123456;
   datetime expiration = 0;
   color arrowColor = clrRed;
   
   int ticket = OrderSend(
      Symbol(),
      OP_SELL,
      lot,
      price,
      slippage,
      stopLoss,
      takeProfit,
      comment,
      magic,
      expiration,
      arrowColor
   );
   
   if(ticket > 0)
   {
      Print("[TenmonExecAgent] SELL order executed: ticket=", ticket);
   }
   else
   {
      Print("[TenmonExecAgent] SELL order failed: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| すべてのポジションを閉じる                                       |
//+------------------------------------------------------------------+
void CloseAll()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == 123456)
         {
            if(OrderType() == OP_BUY)
            {
               OrderClose(OrderTicket(), OrderLots(), Bid, 3);
            }
            else if(OrderType() == OP_SELL)
            {
               OrderClose(OrderTicket(), OrderLots(), Ask, 3);
            }
         }
      }
   }
   
   Print("[TenmonExecAgent] All positions closed");
}

