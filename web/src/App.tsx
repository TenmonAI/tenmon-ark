import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="h-screen bg-[#f7f7f8]">
      <div className="flex h-full bg-white">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-white">
          <Chat />
        </div>
      </div>
    </div>
  );
}
