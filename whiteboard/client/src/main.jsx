import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Board from "./pages/Board";
import Landing from "./pages/Landing";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/board/:roomId" element={<Board />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
