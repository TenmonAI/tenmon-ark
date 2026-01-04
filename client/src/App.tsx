import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="flex h-full bg-gray-50 text-gray-900">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Chat />
      </div>
    </div>
  );
}
