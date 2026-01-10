import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

// Phase 1-B: ビルドID（反映確認のため）
const BUILD_ID = import.meta.env.VITE_BUILD_ID || new Date().toISOString();

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Chat />
      </main>
      {/* Phase 1-B: ビルドID表示（画面下） */}
      <footer className="fixed bottom-0 right-0 px-3 py-1 text-xs text-gray-400 bg-white/50 backdrop-blur">
        Build: {BUILD_ID.substring(0, 19)}
      </footer>
    </div>
  );
}
