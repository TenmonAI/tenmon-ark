// メインApp（ルーティング含む）
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./pages/Chat";
import { GPTsList } from "./pages/GPTsList";
import { GPTDetail } from "./pages/GPTDetail";
import { GPTData } from "./pages/GPTData";

export function App() {
  const path = window.location.pathname;

  // /gpts/:id/data ルート
  const gptDataMatch = path.match(/^\/gpts\/([^/]+)\/data$/);
  if (gptDataMatch) {
    return (
      <div className="flex h-screen bg-gray-100 text-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <GPTData id={gptDataMatch[1]} />
        </div>
      </div>
    );
  }

  // /gpts/:id ルート
  const gptDetailMatch = path.match(/^\/gpts\/([^/]+)$/);
  if (gptDetailMatch) {
    return (
      <div className="flex h-screen bg-gray-100 text-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <GPTDetail id={gptDetailMatch[1]} />
        </div>
      </div>
    );
  }

  // /gpts ルート
  if (path === "/gpts") {
    return (
      <div className="flex h-screen bg-gray-100 text-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <GPTsList />
        </div>
      </div>
    );
  }

  // / (Chat) ルート（デフォルト）
  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Chat />
      </div>
    </div>
  );
}
