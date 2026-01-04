import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Left sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <Chat />
      </div>
    </div>
  );
}
