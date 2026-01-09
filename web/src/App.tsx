import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Chat />
      </main>
    </div>
  );
}
