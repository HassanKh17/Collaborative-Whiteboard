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

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // Join Specific Room
    socket.on("joinRoom", ({ roomId, username, color }) => {
        socket.join(roomId);
        socket.data.username = username;
        socket.data.color = color;
        console.log(`➡️ ${username} joined room: ${roomId}`);

        // Update room user count
        const users = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        io.to(roomId).emit("usersCount", users);

    });

    // when someone draws, broadcast to others
    socket.on("draw", (roomId, data) => {
        socket.to(roomId).emit("draw", data);
    });

    // when someone clears the board
    socket.on("clear", (roomId) => {
        socket.to(roomId).emit("clear");
    });

    socket.on("disconnecting", () => {
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id) {
                const users = (io.sockets.adapter.rooms.get(roomId)?.size || 1) - 1;
                io.to(roomId).emit("usersCount", users);
            }
        }
    });
    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5174;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
