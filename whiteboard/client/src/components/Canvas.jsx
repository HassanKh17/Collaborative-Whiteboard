import { useEffect, useRef, useState } from "react";

// Utility to throttle emissions
const throttle = (fn, ms) => {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            fn(...args);
        }
    };
};

export default function Canvas({ socket, roomId, username, color }) {
    // Base drawing canvas (committed pixels) + overlay for previews & cursors
    const baseRef = useRef(null);
    const overlayRef = useRef(null);

    const [tool, setTool] = useState("draw"); // draw | erase | rect | circle | text
    const [strokeColor, setStrokeColor] = useState(color || "#5ac8fa");
    const [size, setSize] = useState(4);

    // Action history for undo/redo (replay renderer)
    const actionsRef = useRef([]);
    const redoRef = useRef([]);
    const myIdRef = useRef(null);

    // Gesture state
    const drawingRef = useRef(false);
    const startRef = useRef({ x: 0, y: 0 });
    const lastPosRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef({ x: 0, y: 0 });
    const currentPathRef = useRef([]);

    // Remote cursors
    const cursorsRef = useRef({});

    // ---------- Canvas resize ----------
    useEffect(() => {
        const base = baseRef.current;
        const overlay = overlayRef.current;
        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            const parent = base.parentElement.getBoundingClientRect();
            [base, overlay].forEach((c) => {
                c.width = parent.width * ratio;
                c.height = parent.height * ratio;
                c.style.width = `${parent.width}px`;
                c.style.height = `${parent.height}px`;
                const ctx = c.getContext("2d");
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            });
            redrawAll();
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    // Capture socket ID
    useEffect(() => {
        const setId = () => (myIdRef.current = socket.id);
        socket.on("connect", setId);
        setId();
        return () => socket.off("connect", setId);
    }, [socket]);

    const getPos = (e, canvas = baseRef.current) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    // ---------- Drawing helpers ----------
    const drawFreeSegment = (ctx, pts, col, width, composite = "source-over") => {
        if (!pts.length) return;
        ctx.save();
        ctx.globalCompositeOperation = composite;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
    };

    const drawRect = (ctx, a, b, col, width) => {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x);
        const h = Math.abs(a.y - b.y);
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = width;
        ctx.strokeStyle = col;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    };

    const drawCircle = (ctx, a, b, col, width) => {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const r = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 2;
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = width;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    };

    const drawText = (ctx, at, text, col, fontSize, box) => {
        if (!text) return;
        ctx.save();
        ctx.fillStyle = col;
        ctx.font = `${fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = "top";

        if (box) {
            const words = text.split(" ");
            let line = "";
            let y = at.y;
            const maxWidth = box.w - 8;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line, at.x, y);
                    line = words[n] + " ";
                    y += fontSize * 1.2;
                    if (y > at.y + box.h - fontSize) break;
                } else line = testLine;
            }
            ctx.fillText(line, at.x, y);
        } else {
            ctx.fillText(text, at.x, at.y);
        }
        ctx.restore();
    };

    const redrawAll = () => {
        const ctx = baseRef.current.getContext("2d");
        ctx.clearRect(0, 0, baseRef.current.width, baseRef.current.height);
        actionsRef.current.forEach((a) => renderAction(ctx, a));
    };

    const renderAction = (ctx, a) => {
        switch (a.type) {
            case "free":
                drawFreeSegment(ctx, a.points, a.color, a.size);
                break;
            case "erase":
                drawFreeSegment(ctx, a.points, "#000", a.size, "destination-out");
                break;
            case "rect":
                drawRect(ctx, a.start, a.end, a.color, a.size);
                break;
            case "circle":
                drawCircle(ctx, a.start, a.end, a.color, a.size);
                break;
            case "text":
                drawText(ctx, a.at, a.text, a.color, a.size, a.box);
                break;
            default:
                break;
        }
    };

    const commitAction = (action, broadcast = true) => {
        actionsRef.current.push(action);
        redoRef.current = [];
        redrawAll();
        if (broadcast) socket.emit("action", roomId, action);
    };

    // ---------- Mouse handlers ----------
    const onMouseDown = (e) => {
        const pos = getPos(e);
        drawingRef.current = true;
        startRef.current = pos;
        lastPosRef.current = pos;
        currentPosRef.current = pos;
        currentPathRef.current = [pos];

        if (tool === "text") {
            // Start defining text box
            const overlay = overlayRef.current.getContext("2d");
            overlay.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        } else if (tool === "draw" || tool === "erase") {
            const ctx = baseRef.current.getContext("2d");
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const onMouseMove = throttle((e) => {
        const pos = getPos(e);
        currentPosRef.current = pos;
        socket.emit("cursor", roomId, { x: pos.x, y: pos.y, username, color: strokeColor });

        if (!drawingRef.current) return;

        const overlay = overlayRef.current.getContext("2d");
        overlay.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

        if (tool === "draw" || tool === "erase") {
            currentPathRef.current.push(pos);
            const ctx = baseRef.current.getContext("2d");
            if (tool === "erase") drawFreeSegment(ctx, [lastPosRef.current, pos], "#000", size, "destination-out");
            else drawFreeSegment(ctx, [lastPosRef.current, pos], strokeColor, size);
            lastPosRef.current = pos;
        }

        if (tool === "rect") drawRect(overlay, startRef.current, pos, strokeColor, size);
        else if (tool === "circle") drawCircle(overlay, startRef.current, pos, strokeColor, size);
        else if (tool === "text") {
            overlay.save();
            overlay.strokeStyle = strokeColor + "AA";
            overlay.setLineDash([6, 4]);
            overlay.strokeRect(startRef.current.x, startRef.current.y, pos.x - startRef.current.x, pos.y - startRef.current.y);
            overlay.restore();
        }
    }, 16);

    const onMouseUp = (e) => {
        if (!drawingRef.current) return;
        drawingRef.current = false;

        const end = getPos(e);
        lastPosRef.current = end;
        const overlay = overlayRef.current.getContext("2d");
        overlay.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

        let action = null;

        if (tool === "draw" || tool === "erase") {
            const pts = currentPathRef.current.slice();
            if (pts.length > 1) {
                action = {
                    id: `${socket.id}-${Date.now()}`,
                    type: tool === "erase" ? "erase" : "free",
                    points: pts,
                    color: strokeColor,
                    size,
                    user: socket.id,
                };
            }
        } else if (tool === "rect") {
            action = {
                id: `${socket.id}-${Date.now()}`,
                type: "rect",
                start: startRef.current,
                end,
                color: strokeColor,
                size,
                user: socket.id,
            };
        } else if (tool === "circle") {
            action = {
                id: `${socket.id}-${Date.now()}`,
                type: "circle",
                start: startRef.current,
                end,
                color: strokeColor,
                size,
                user: socket.id,
            };
        } else if (tool === "text") {
            const x = Math.min(startRef.current.x, end.x);
            const y = Math.min(startRef.current.y, end.y);
            const w = Math.abs(startRef.current.x - end.x);
            const h = Math.abs(startRef.current.y - end.y);
            if (w < 10 || h < 10) return;
            const text = prompt("Enter text:");
            if (!text || !text.trim()) return;

            // auto-fit text to box
            const ctx = baseRef.current.getContext("2d");
            let fontSize = h * 0.6;
            ctx.font = `${fontSize}px system-ui, sans-serif`;
            let textWidth = ctx.measureText(text).width;
            if (textWidth > w) fontSize *= w / textWidth;

            const actionText = {
                id: `${socket.id}-${Date.now()}`,
                type: "text",
                at: { x: x + 4, y: y + 4 },
                box: { w, h },
                text: text.trim(),
                color: strokeColor,
                size: fontSize,
                user: socket.id,
            };
            commitAction(actionText);
        }

        if (action) commitAction(action);
        currentPathRef.current = [];
    };

    // ---------- Undo / Redo ----------
    const undo = () => {
        for (let i = actionsRef.current.length - 1; i >= 0; i--) {
            if (actionsRef.current[i].user === myIdRef.current) {
                const [removed] = actionsRef.current.splice(i, 1);
                redoRef.current.push(removed);
                redrawAll();
                socket.emit("undo", roomId, removed.id);
                break;
            }
        }
    };

    const redo = () => {
        const a = redoRef.current.pop();
        if (!a) return;
        actionsRef.current.push(a);
        redrawAll();
        socket.emit("redo", roomId, a);
    };

    const clearAll = () => {
        const base = baseRef.current;
        base.getContext("2d").clearRect(0, 0, base.width, base.height);
        actionsRef.current = [];
        redoRef.current = [];
        socket.emit("clear", roomId);
    };

    const saveAsPNG = () => {
        const base = baseRef.current;
        const link = document.createElement("a");
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = base.toDataURL("image/png");
        link.click();
    };

    // ---------- Collaboration listeners ----------
    useEffect(() => {
        const onAction = (action) => {
            actionsRef.current.push(action);
            redrawAll();
        };
        const onUndo = (actionId) => {
            const idx = actionsRef.current.findIndex((a) => a.id === actionId);
            if (idx >= 0) {
                actionsRef.current.splice(idx, 1);
                redrawAll();
            }
        };
        const onClear = () => {
            actionsRef.current = [];
            redoRef.current = [];
            baseRef.current.getContext("2d").clearRect(0, 0, baseRef.current.width, baseRef.current.height);
        };
        const onCursor = ({ id, x, y, username: u, color: c }) => {
            cursorsRef.current[id] = { x, y, username: u, color: c, ts: Date.now() };
            drawCursors();
        };

        socket.on("action", onAction);
        socket.on("undo", onUndo);
        socket.on("clear", onClear);
        socket.on("cursor", onCursor);

        return () => {
            socket.off("action", onAction);
            socket.off("undo", onUndo);
            socket.off("clear", onClear);
            socket.off("cursor", onCursor);
        };
    }, [socket, roomId]);

    // ---------- Cursor rendering ----------
    const drawCursors = () => {
        const ctx = overlayRef.current.getContext("2d");
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        const now = Date.now();
        for (const id in cursorsRef.current) {
            const cur = cursorsRef.current[id];
            if (now - cur.ts > 2000) continue;
            ctx.save();
            ctx.fillStyle = cur.color || "#fff";
            ctx.beginPath();
            ctx.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
            ctx.fill();

            const label = cur.username || id.slice(0, 4);
            ctx.font = "12px system-ui, sans-serif";
            ctx.textBaseline = "bottom";
            const pad = 4;
            const w = ctx.measureText(label).width + pad * 2;
            const h = 16;
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(cur.x + 8, cur.y - h - 6, w, h);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, cur.x + 8 + pad, cur.y - 8);
            ctx.restore();
        }
    };

    useEffect(() => {
        const t = setInterval(drawCursors, 300);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="canvas-wrap">
            {/* Toolbar */}
            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    display: "flex",
                    gap: 8,
                    zIndex: 10,
                    flexWrap: "wrap",
                }}
            >
                <button className={`btn ${tool === "draw" ? "active" : ""}`} onClick={() => setTool("draw")}>✏️ Draw</button>
                <button className={`btn ${tool === "erase" ? "active" : ""}`} onClick={() => setTool("erase")}>🧽 Erase</button>
                <button className={`btn ${tool === "rect" ? "active" : ""}`} onClick={() => setTool("rect")}>▭ Rect</button>
                <button className={`btn ${tool === "circle" ? "active" : ""}`} onClick={() => setTool("circle")}>◯ Circle</button>
                <button className={`btn ${tool === "text" ? "active" : ""}`} onClick={() => setTool("text")}>🔤 Text</button>

                <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
                <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(+e.target.value)} />

                <button className="btn" onClick={undo}>↶ Undo</button>
                <button className="btn" onClick={redo}>↷ Redo</button>
                <button className="btn" onClick={clearAll}>🧹 Clear</button>
                <button className="btn" onClick={saveAsPNG}>💾 Save</button>
            </div>

            {/* Base + Overlay canvases */}
            <canvas
                ref={baseRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={(e) => {
                    if (drawingRef.current) {
                        lastPosRef.current = getPos(e);
                        onMouseUp(e);
                    }
                }}
                style={{ cursor: "crosshair", width: "100%", height: "100%" }}
            />
            <canvas
                ref={overlayRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
