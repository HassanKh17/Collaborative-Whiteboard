import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Maintain room users
const getRoomUsers = (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room).map((id) => {
        const s = io.sockets.sockets.get(id);
        return {
            id,
            username: s?.data?.username || "Unknown",
            color: s?.data?.color || "#fff",
        };
    });
};

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("joinRoom", ({ roomId, username, color }) => {
        socket.join(roomId);
        socket.data.username = username;
        socket.data.color = color;
        console.log(`➡️ ${username} joined room: ${roomId}`);

        // Notify everyone in the room
        const users = getRoomUsers(roomId);
        io.to(roomId).emit("usersCount", users.length);
        io.to(roomId).emit("roomUsers", users);
    });

    socket.on("action", (roomId, action) => socket.to(roomId).emit("action", action));
    socket.on("undo", (roomId, id) => socket.to(roomId).emit("undo", id));
    socket.on("redo", (roomId, a) => socket.to(roomId).emit("redo", a));
    socket.on("clear", (roomId) => socket.to(roomId).emit("clear"));
    socket.on("cursor", (roomId, data) => socket.to(roomId).emit("cursor", { ...data, id: socket.id }));

    socket.on("disconnecting", () => {
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id) {
                const users = getRoomUsers(roomId).filter((u) => u.id !== socket.id);
                io.to(roomId).emit("usersCount", users.length);
                io.to(roomId).emit("roomUsers", users);
            }
        }
    });

    socket.on("disconnect", () => console.log("🔴 User disconnected:", socket.id));
});

const PORT = process.env.PORT || 5174;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
