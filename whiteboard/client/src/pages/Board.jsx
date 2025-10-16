import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Canvas from "../components/Canvas";
import { socket } from "../socket";

export default function Board() {
    const { roomId } = useParams();
    const [username] = useState(() => "User-" + Math.floor(Math.random() * 1000));
    const [color] = useState(() => "#" + Math.floor(Math.random() * 16777215).toString(16));
    const [usersCount, setUsersCount] = useState(0);
    const [roomUsers, setRoomUsers] = useState([]);

    useEffect(() => {
        if (!socket.connected) socket.connect();
        socket.emit("joinRoom", { roomId, username, color });

        socket.on("usersCount", (count) => setUsersCount(count));
        socket.on("roomUsers", (users) => setRoomUsers(users));

        return () => {
            socket.off("usersCount");
            socket.off("roomUsers");
            socket.disconnect();
        };
    }, [roomId, username, color]);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("✅ Room link copied to clipboard!");
    };

    return (
        <div
            className="container"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                background: "#0b0c10",
                color: "#fff",
            }}
        >
            {/* ===== Header ===== */}
            <header
                className="header"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 20px",
                    background: "#11141c",
                    borderBottom: "1px solid #202635",
                }}
            >
                <div className="brand">
                    🧑 {username} in Room <b>{roomId}</b>
                </div>
                <div className="meta">👥 {usersCount} connected</div>
                <button className="btn" onClick={copyLink}>
                    🔗 Copy Link
                </button>
            </header>

            {/* ===== Active Users Bar ===== */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "#0f1119",
                    borderBottom: "1px solid #202635",
                    minHeight: "40px",
                    overflowX: "auto",
                }}
            >
                {roomUsers.map((u) => (
                    <div
                        key={u.id}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: u.color,
                            color: "#000",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            fontWeight: 600,
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                    >
                        {u.username === username ? `${u.username} (You)` : u.username}
                    </div>
                ))}
            </div>

            {/* ===== Canvas Area ===== */}
            <main
                style={{
                    flex: 1,
                    position: "relative",
                    overflow: "hidden",
                    background: "#0b0c10",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        width: "98%",
                        height: "96%",
                        border: "2px dashed #2b2e3b",
                        borderRadius: "8px",
                        position: "relative",
                    }}
                >
                    <Canvas socket={socket} roomId={roomId} username={username} color={color} />
                </div>
            </main>
        </div>
    );
}
