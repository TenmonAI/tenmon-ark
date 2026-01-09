import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="flex bg-white">
        <Sidebar />
        <main className="min-h-screen flex-1 overflow-y-auto bg-white">
          <Chat />
        </main>
      </div>
    </div>
  );
}
