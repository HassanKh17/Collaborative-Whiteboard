import { useEffect, useRef, useState } from "react";


export default function Canvas({ socket, roomId }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#5ac8fa");
    const [size, setSize] = useState(4);
    const [mode, setMode] = useState("draw"); // or "erase"
    const lastEmitRef = useRef(0);

    // Adjust canvas size to fill parent
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            const { width, height } = canvas.parentElement.getBoundingClientRect();
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        };

        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;

        const now = Date.now();
        if (now - lastEmitRef.current < 10) return; // limit to 100fps
        lastEmitRef.current = now;

        const pos = getPos(e);
        const ctx = canvasRef.current.getContext("2d");

        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (mode === "erase") {
            ctx.globalCompositeOperation = "destination-out";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
        }

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        socket.emit("draw", roomId, { x: pos.x, y: pos.y, color, size, mode });

    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit("clear", roomId);
    };

    const saveAsImage = () => {
        const canvas = canvasRef.current;
        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // Listen for events from others
    useEffect(() => {
        const ctx = canvasRef.current.getContext("2d");

        socket.on("draw", ({ x, y, color, size, mode }) => {
            ctx.lineWidth = size;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            if (mode === "erase") {
                ctx.globalCompositeOperation = "destination-out";
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = color;
            }
            ctx.lineTo(x, y);
            ctx.stroke();
        });

        socket.on("clear", () => {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        });

        return () => {
            socket.off("draw");
            socket.off("clear");
        };
    }, []);


    return (
        <div className="canvas-wrap">
            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    display: "flex",
                    gap: 8,
                    zIndex: 10,
                }}
            >
                <button className="btn" onClick={clearCanvas}>
                    Clear
                </button>
                <button
                    className={`btn ${mode === "draw" ? "active" : ""}`}
                    onClick={() => setMode("draw")}
                >
                    ✏️ Draw
                </button>
                <button
                    className={`btn ${mode === "erase" ? "active" : ""}`}
                    onClick={() => setMode("erase")}
                >
                    🧽 Erase
                </button>
                <button className="btn" onClick={saveAsImage}>
                    💾 Save as PNG
                </button>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                />
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={size}
                    onChange={(e) => setSize(+e.target.value)}
                />
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ cursor: "crosshair", width: "100%", height: "100%" }}
            ></canvas>
        </div>
    );
}
