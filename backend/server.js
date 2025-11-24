/**
 * File-backed user store + simple auth API
 * Run with:
 *   cd C:\Users\Pc\Documents\Questloggd\backend
 *   node server.js
 */

console.log("================");
console.log("SCRIPT STARTING");
console.log("================");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

dotenv.config();

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || `http://localhost:${PORT}`;
const USERS_FILE = path.join(__dirname, "users.json");

const app = express();
console.log(`Port selected: ${PORT}`);

// ====== Middleware Setup ======
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);

app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// ====== Helpers ======
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error loading users:", err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error saving users:", err);
    return false;
  }
}

function findUserByEmail(email) {
  const users = loadUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

// ====== Routes ======

// Signup
app.post("/api/signup", async (req, res) => {
  console.log("Signup request received:", req.body);

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

  try {
    const users = loadUsers();

    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const id = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id, email, passwordHash };

    users.push(user);

    if (!saveUsers(users)) {
      throw new Error("Failed to save user to file");
    }

    console.log("User saved successfully:", email);

    req.session.user = { id: user.id, email: user.email };
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

    res.status(201).json({ token, redirect: "/quest_user.html" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.user = { id: user.id, email: user.email };
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

  res.json({ ok: true, token, redirect: "/quest_user.html" });
});

// Check auth
app.get("/api/check-auth", (req, res) => {
  if (req.session && req.session.user)
    return res.json({ authenticated: true, user: req.session.user });
  res.json({ authenticated: false });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ ok: true });
  });
});

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// Route listing
app.get("/__routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods).join(",").toUpperCase(),
      });
    }
  });
  res.json({ routes });
});

// Serve frontend
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.type("text").send("Backend is running!");
  });
});

// ===================================================================
// ⭐ ADDED: RAWG Proxy Search Route
// ===================================================================
app.get("/games/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    if (!process.env.RAWG_KEY) {
      console.error("Missing RAWG_KEY in .env");
      return res.status(500).json({ error: "RAWG key not configured" });
    }

    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(
      q
    )}&page_size=8&key=${process.env.RAWG_KEY}`;

    console.log("RAWG URL:", url);

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      console.error("RAWG error:", r.status, text);
      return res.status(502).json({ error: "RAWG request failed" });
    }

    const data = await r.json();

    const out = (data.results || []).map((g) => ({
      id: g.id,
      name: g.name,
      year: (g.released || "").slice(0, 4),
      image: g.background_image,
    }));

    res.json(out);
  } catch (err) {
    console.error("Search route failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===================================================================
// ⭐ ADDED: Log Create Route
// ===================================================================
app.post("/logs", (req, res) => {
  console.log("LOG ENTRY:", req.body);
  res.json({ ok: true, id: Date.now(), ...req.body });
});

// ===================================================================
// 404 HANDLER (KEEP LAST)
// ===================================================================
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

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
