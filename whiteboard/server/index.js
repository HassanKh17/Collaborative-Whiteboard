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

    // when someone draws, broadcast to others
    socket.on("draw", (data) => {
        socket.broadcast.emit("draw", data);
    });

    // when someone clears the board
    socket.on("clear", () => {
        socket.broadcast.emit("clear");
    });

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5174;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
