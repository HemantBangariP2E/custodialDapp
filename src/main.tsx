import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");
if (!el) {
  document.body.innerHTML =
    "<p style=\"font-family:system-ui;padding:1rem\">Missing #root in index.html.</p>";
} else {
  ReactDOM.createRoot(el).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
