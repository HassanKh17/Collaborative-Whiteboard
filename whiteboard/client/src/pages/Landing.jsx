import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { nanoid } from "nanoid";

export default function Landing() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");

    const createRoom = () => {
        const id = nanoid(6);
        navigate(`/board/${id}`);
    };

    const joinRoom = () => {
        if (!roomId.trim()) return alert("Please enter a valid room ID.");
        navigate(`/board/${roomId.trim()}`);
    };

    return (
        <div
            style={{
                display: "grid",
                placeItems: "center",
                height: "100vh",
                color: "white",
            }}
        >
            <div style={{ textAlign: "center" }}>
                <h1>✏️ Collaborative Whiteboard</h1>
                <button className="btn" onClick={createRoom}>
                    ➕ Create New Board
                </button>
                {/* Join existing board */}
                <div>
                    <input
                        className="input"
                        type="text"
                        placeholder="Enter existing Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        style={{ marginRight: "8px" }}
                    />
                    <button className="btn" onClick={joinRoom}>
                        🔗 Join Board
                    </button>
                </div>

                <p style={{ color: "#9aa5b1", fontSize: "0.9rem" }}>
                    Or share your room link like:
                    <br />
                    <code>http://localhost:5173/board/<b>abc123</b></code>
                </p>
            </div>
        </div>
    );
}
