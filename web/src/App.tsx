import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f8]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <Chat />
      </main>
    </div>
  );
}
