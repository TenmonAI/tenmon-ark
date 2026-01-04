import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="flex h-screen bg-[#f7f7f8]">
      <Sidebar />
      <div className="flex-1">
        <Chat />
      </div>
    </div>
  );
}
