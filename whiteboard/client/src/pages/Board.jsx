import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Canvas from "../components/Canvas";
import { socket } from "../socket";

export default function Board() {
    const { roomId } = useParams();
    const [username] = useState(() => "User-" + Math.floor(Math.random() * 1000));
    const [color] = useState(() =>
        "#" + Math.floor(Math.random() * 16777215).toString(16)
    );
    const [users, setUsers] = useState(0);

    useEffect(() => {
        if (!socket.connected) socket.connect();

        let hasJoined = false;

        const handleConnect = () => {
            if (!hasJoined) {
                socket.emit("joinRoom", { roomId, username, color });
                hasJoined = true;
            }
        };

        socket.on("connect", handleConnect);
        socket.on("usersCount", (count) => setUsers(count));

        return () => {
            socket.off("connect", handleConnect);
            socket.off("usersCount");
            socket.disconnect();
        };
    }, [roomId, username, color]);


    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("✅ Room link copied to clipboard!");
    };

    return (
        <div className="container">
            <header className="header">
                <div className="brand">
                    🧑 {username} in Room <b>{roomId}</b>
                </div>
                <div className="meta">👥 {users} connected</div>
                <button className="btn" onClick={copyLink}>
                    🔗 Copy Link
                </button>
            </header>

            <main className="board">
                <aside className="sidebar">
                    <div className="badge" style={{ background: color }}>
                        {username}
                    </div>
                </aside>

                <Canvas socket={socket} roomId={roomId} />
            </main>
        </div>
    );
}
