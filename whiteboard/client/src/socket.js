import { io } from "socket.io-client";

const URL = "http://localhost:5174";

export const socket = io(URL, {
    autoConnect: false, // We'll connect manually
});
