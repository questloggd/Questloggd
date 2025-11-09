/**
 * Clean, single-file Express server for Questloggd backend.
 * Save this file, then run from backend folder:
 *   cd C:\Users\Pc\Documents\Questloggd\backend
 *   node server.js
 *
 * Optional: Uncomment mongoose or fetch if you plan to use them.
 */

console.log("================");
console.log("SCRIPT STARTING");
console.log("================");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Optional — only enable if you actually need them
// const mongoose = require("mongoose");
// const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting server initialization...");
console.log(`Port selected: ${PORT}`);

// Basic request logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// Example auth endpoints (placeholders)
app.post("/auth/login", (req, res) => {
  console.log("/auth/login called with body:", req.body);
  res.status(501).json({ error: "Not implemented: /auth/login" });
});

app.post("/auth/signup", (req, res) => {
  console.log("/auth/signup called with body:", req.body);
  res.status(501).json({ error: "Not implemented: /auth/signup" });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Serve index.html for root
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.warn("index.html not found, sending text fallback");
      res.type("text").send("Backend is running!");
    }
  });
});

// Catch-all for SPA (exclude API and special routes)
app.get(/^\/(?!api|auth|__routes).*/, (req, res) => {
  const indexPath = path.join(frontendDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send("Not found");
  });
});

// Debug route to list registered routes
app.get("/__routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods)
        .join(",")
        .toUpperCase();
      routes.push({ path: layer.route.path, methods });
    }
  });
  res.json({ routes });
});

// 404 handler
app.use((req, res) => {
  console.warn("NO ROUTE for", req.method, req.url);
  res.status(404).send(`Not found: ${req.method} ${req.url}`);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.warn("Forcing exit");
    process.exit(1);
  }, 5000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
