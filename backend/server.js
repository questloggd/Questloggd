/**
 * File-backed user store + simple auth API
 * Save, then run:
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

// ensure users file exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]", "utf8");
}

// helpers
function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}
function findUserByEmail(email) {
  if (!email) return null;
  const users = loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// logging, parsers
app.use((req, res, next) => { console.log(new Date().toISOString(), req.method, req.url); next(); });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS: allow frontend origin if you serve frontend separately; it's safe to serve frontend from backend to avoid cross-origin
app.use(cors({
  origin: (origin, cb) => cb(null, true), // dev: reflect any origin
  credentials: true
}));

// session
app.use(session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true in production with HTTPS
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// static frontend from ../frontend
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// --------- AUTH API ----------

// Signup: POST /api/signup { email, password }
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  if (findUserByEmail(email)) return res.status(409).json({ error: "Email already registered" });

  const users = loadUsers();
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id, email, passwordHash };
  users.push(user);
  saveUsers(users);

  // create session and token
  req.session.user = { id: user.id, email: user.email };
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

  res.status(201).json({ ok: true, token, redirect: "/quest_user.html" });
});

// Login: POST /api/login { email, password }
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

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
  if (req.session && req.session.user) return res.json({ authenticated: true, user: req.session.user });
  res.json({ authenticated: false });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ ok: true });
  });
});

// health & debug
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.get("/__routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach(layer => {
    if (layer.route && layer.route.path) {
      routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods).join(",").toUpperCase() });
    }
  });
  res.json({ routes });
});

// root serve index.html
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDir, "index.html");
  res.sendFile(indexPath, err => { if (err) res.type("text").send("Backend is running!"); });
});

// 404
app.use((req, res) => {
  console.warn("NO ROUTE for", req.method, req.url);
  res.status(404).send(`Not found: ${req.method} ${req.url}`);
});

// start
const server = app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });

server.on("error", (err) => { console.error("Server error:", err); });

process.on("uncaughtException", (error) => { console.error("Uncaught Exception:", error); });
process.on("unhandledRejection", (reason, promise) => { console.error("Unhandled Rejection at:", promise, "reason:", reason); });