import Canvas from "./components/Canvas";

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <div className="brand">✏️ Collaborative Whiteboard</div>
        <div className="meta">React + Socket.io (Plain CSS)</div>
      </header>

      <main className="board">
        <aside className="sidebar">
          <div className="badge">🧑 Local Mode</div>
        </aside>

        <Canvas />
      </main>
    </div>
  );
}
