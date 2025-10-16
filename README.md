# 🧑‍🏫 Collaborative Whiteboard

A real-time collaborative whiteboard built with **React**, **Socket.IO**, and **Express** — supporting multiple users drawing, adding shapes, text annotations, undo/redo, and live cursors in shared rooms.

<img width="2879" height="1476" alt="image" src="https://github.com/user-attachments/assets/361e9023-8d9b-425f-88b5-d31ef3f2d723" />


---

## 🚀 Features

✅ **Real-time collaboration** — Multiple users can draw together on the same board in sync.  
✅ **Shapes** — Draw rectangles and circles easily.  
✅ **Text tool** — Add text annotations anywhere on the canvas.  
✅ **Undo / Redo** — Step backward or forward through your drawing history.  
✅ **User cursors** — See where others are drawing in real-time.  
✅ **Custom colors**.  
✅ **Room-based collaboration** — Each room has a unique shareable link.  
✅ **Fully responsive UI** with smooth animations and live connection info.  
✅ **Server-served frontend** — Express hosts the built React app for production deployment.

---

## 🧱 Project Structure

```
whiteboard/
├── client/             # React frontend
│   ├── src/            # Components, pages, and socket logic
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/             # Node.js + Express + Socket.IO backend
│   ├── index.js        # Server entry point
│   ├── package.json
│   └── render-build.sh (optional for Render deploy)
│
└── README.md
```

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React, Vite, Socket.IO client |
| Backend | Node.js, Express, Socket.IO |
| Realtime Communication | WebSockets (Socket.IO) |
| Deployment | Render (server hosts both API + React build) |

---

## ⚙️ Local Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/HassanKh17/Collaborative-Whiteboard.git
cd Collaborative-Whiteboard/whiteboard
```

### 2️⃣ Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3️⃣ Run development servers

In one terminal (backend):
```bash
cd server
npm run dev
```

In another terminal (frontend):
```bash
cd client
npm run dev
```

Now open the client URL (usually `http://localhost:5173`) and the backend will run on `http://localhost:5174`.

---

## 🧰 Production Build (Express serves frontend)

To build and serve the React app from the Express server:

```bash
# From whiteboard/server
npm install --prefix ../client
npm run build --prefix ../client
node index.js
```

Then visit:
```
http://localhost:5174
```

---

## 🌍 Deployment on Render

For deployment with Render, use the following settings:

- **Root Directory:** `whiteboard/server`  
- **Build Command:**
  ```bash
  npm install --production=false --prefix ../client && npm run build --prefix ../client && npm install
  ```
- **Start Command:**
  ```bash
  node index.js
  ```

Your Express server will automatically serve the built React app and handle Socket.IO connections.

---

## 📡 How It Works

- Each user joins a unique room via a generated room ID.
- Socket.IO syncs drawing actions (paths, shapes, text) across connected clients.
- The server keeps room state minimal — it just relays actions in real-time.
- Undo/redo and local history are managed client-side.
- The React app renders all actions to an HTML canvas with a secondary overlay for cursor previews.


---

### 🧠 Future Enhancements
- Persistent storage of drawings (e.g., MongoDB or Firebase)
- User authentication & profile colors
- Export sessions to image or video
- Multi-room dashboard
- Voice chat integration 🎤

---

**Built with ❤️ using React, Node.js, and Socket.IO.**
