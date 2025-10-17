import { io } from "socket.io-client";

// Use the current domain if deployed, else fallback to localhost
const URL =
    import.meta.env.PROD
        ? window.location.origin
        : "http://localhost:5174";

export const socket = io(URL, {
    transports: ["websocket"],
    withCredentials: true,
});
