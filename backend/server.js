/**
 * Database user store + simple auth API
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
const session = require("express-session");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const fetch = require("node-fetch");

dotenv.config();
console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "dev-secret-change-me";

const app = express();
console.log(`Port selected: ${PORT}`);

// ====== Middleware ======
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

// ====== Mongoose Schemas ======
const GameSchema = new mongoose.Schema({
  id: Number,
  name: String,
  year: String,
  image: String,
});

const LogSchema = new mongoose.Schema({
  userId: Number,
  gameId: Number,
  gameName: String,
  rating: { type: Number, default: 0 },
  review: { type: String, default: '' },
  image: { type: String, default: '' },
  year: { type: String, default: '' },
  genre: { type: [String], default: [] }, // can be array of genres
  platforms: { type: [String], default: [] }, // can be array of platforms
  popularity: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  id: Number,
  email: { type: String, unique: true },
  passwordHash: String,

  steamName: { type: String, default: "" },
  xboxName: { type: String, default: "" },
  psnName: { type: String, default: "" }
});

const Game = mongoose.model("Game", GameSchema);
const Log = mongoose.model("Log", LogSchema);
const User = mongoose.model("User", UserSchema);

// ====== Routes ======

// Signup
app.post("/api/signup", async (req, res) => {
  console.log("Signup request received:", req.body);

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const lastUser = await User.findOne().sort({ id: -1 });
    const id = lastUser ? lastUser.id + 1 : 1;

    const user = await User.create({
      id,
      email: email.toLowerCase(),
      passwordHash,
    });

    req.session.user = { id: user.id, email: user.email };
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

    res.status(201).json({
      token,
      redirect: "/quest_user.html",
      user: { id: user.id }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/api/link-account", async (req, res) => {
  if (!req.session?.user?.id)
    return res.status(401).json({ error: "Not logged in" });

  const userId = req.session.user.id;
  const { platform, username } = req.body;

  if (!["steam", "xbox", "psn"].includes(platform))
    return res.status(400).json({ error: "Invalid platform" });

  const update = {};
  if (platform === "steam") update.steamName = username;
  if (platform === "xbox") update.xboxName = username;
  if (platform === "psn") update.psnName = username;

  await User.updateOne({ id: userId }, update);
  res.json({ ok: true, message: platform + " linked!" });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.user = { id: user.id, email: user.email };
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

    res.json({ ok: true, token, redirect: "/quest_user.html", user: { id: user.id } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
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
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Serve frontend
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));
app.get("/", (req, res) => res.sendFile(path.join(frontendDir, "index.html")));

// ====== RAWG Proxy / Caching ======
app.get("/games/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    const existing = await Game.find({ name: new RegExp(q, "i") }).limit(8);
    if (existing.length > 0) return res.json(existing);

    if (!process.env.RAWG_KEY)
      return res.status(500).json({ error: "RAWG key not configured" });

    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=8&key=${process.env.RAWG_KEY}`;
    const rawgResponse = await fetch(url);
    const data = await rawgResponse.json();

    const games = (data.results || []).map(g => ({
      id: g.id,
      name: g.name,
      year: (g.released || "").slice(0, 4),
      image: g.background_image || ''
    }));

    if (games.length > 0) await Game.insertMany(games, { ordered: false }).catch(() => {});
    res.json(games);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====== Logs ======

// Create log
app.post("/logs", async (req, res) => {
  try {
    const {
      userId,
      gameId,
      gameName,
      rating,
      review,
      image,
      year,
      genre,
      platforms,
      popularity
    } = req.body;


    if (!userId || !gameId || !gameName)
      return res.status(400).json({ error: "Missing required fields" });

    const log = new Log({
      userId,
      gameId,
      gameName,
      rating: rating || 0,
      review: review || '',
      image: image || '',
      year: year || '',
      genre: genre || [],
      platforms: platforms || [],
      popularity: popularity || 0
    });

    await log.save();
    console.log("📝 Log saved:", log);
    res.json({ ok: true, log });
  } catch (err) {
    console.error("Failed to save log:", err);
    res.status(500).json({ error: "Could not save log" });
  }
});

// Get logs for current user
app.get("/logs", async (req, res) => {
  try {
    if (!req.session?.user?.id)
      return res.status(401).json({ error: "Not logged in" });

    const logs = await Log.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error("Failed to fetch logs:", err);
    res.status(500).json({ error: "Could not fetch logs" });
  }
});

// ====== User Profile ======
app.get("/api/user/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const logs = await Log.find({ userId });

    // Favourite games (top rated)
    const favouriteGames = logs
      .filter(l => l.rating > 0)
      .sort((a,b) => b.rating - a.rating)
      .slice(0, 4)
      .map(l => ({
        gameId: l.gameId,
        name: l.gameName,
        gameName: l.gameName,
        rating: l.rating,
        image: l.image || '',
        year: l.year || 'Unknown',
        genre: l.genre || [],
        platforms: l.platforms || [],
        popularity: l.popularity || 0
      }));

    // Recently played (most recent logs)
    const recentlyPlayed = logs
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(l => ({
        gameId: l.gameId,
        name: l.gameName,
        gameName: l.gameName,
        image: l.image || '',
        year: l.year || 'Unknown',
        genre: l.genre || [],
        platforms: l.platforms || [],
        popularity: l.popularity || 0
      }));

    // Recent reviews
    const recentReviews = logs
      .filter(l => l.review && l.review.trim() !== '')
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(l => ({
        gameId: l.gameId,
        name: l.gameName,
        gameName: l.gameName,
        review: l.review,
        rating: l.rating,
        image: l.image || '',
        year: l.year || 'Unknown',
        genre: l.genre || [],
        platforms: l.platforms || [],
        popularity: l.popularity || 0
      }));

    res.json({
      username: user.email.split('@')[0],
      profilePic: user.profilePic || 'images/profile.jpg',
      level: user.level || 1,
      expPercent: user.expPercent || 50,
      bio: user.bio || 'No bio yet',
      gamesPlayed: logs.length,
      listsCreated: user.listsCreated || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      recentActivity: logs
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0,5)
        .map(l => `Played ${l.gameName}`),
      favouriteGames,
      recentlyPlayed,
      recentReviews
    });
  } catch (err) {
    console.error("Error in /api/user/:id:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/game/:id
app.get("/api/game/:id", async (req, res) => {
  const gameId = parseInt(req.params.id);
  const game = await Game.findOne({ id: gameId });
  if (!game) return res.status(404).json({ error: "Game not found" });

  res.json({
    name: game.name,
    image: game.image || "images/default_game.jpg",
    description: game.description || "No description available"
  });
});

// GET /api/game/logs/:id
app.get("/api/game/logs/:id", async (req, res) => {
  const gameId = parseInt(req.params.id);

  // Fetch logs for this game
  const logs = await Log.find({ gameId });

  // Get unique userIds from logs
  const userIds = [...new Set(logs.map(l => l.userId))];
  const users = await User.find({ id: { $in: userIds } });

  // Map userId → username (email before @)
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = u.email.split("@")[0]; // extract username from email
  });

  const formattedLogs = logs.map(l => ({
    userId: l.userId,
    username: userMap[l.userId] || "Unknown User",
    userPfp: l.image || "images/profile.jpg",
    rating: l.rating,
    review: l.review,
    gameName: l.gameName,
    gameId: l.gameId
  }));

  res.json(formattedLogs);
});



// Get unique games for current user (most recent log per game)
app.get("/api/user/games", async (req, res) => {
  try {
    if (!req.session?.user?.id)
      return res.status(401).json({ error: "Not logged in" });

    const userId = req.session.user.id;
    const logs = await Log.find({ userId }).sort({ createdAt: -1 });

    // Remove duplicates, keep most recent per gameId
    const seen = new Set();
    for (const log of logs) {
      if (!seen.has(log.gameId)) {
        seen.add(log.gameId);
        uniqueGames.push({
          gameId: log.gameId,
          id: log.gameId,
          name: log.gameName,
          gameName: log.gameName,
          cover: log.image || "images/default_game.jpg",
          image: log.image || "images/default_game.jpg",
          genre: log.genre || [],
          platforms: log.platforms || [],
          year: log.year || "Unknown",
          popularity: log.popularity || 0
        });
      }
    }

res.json(uniqueGames);

    res.json({ games: uniqueGames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get current logged-in user
app.get("/api/me", async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: "Not logged in" });

  const user = await User.findOne({ id: req.session.user.id });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    email: user.email,
    username: user.email.split("@")[0]
  });
});

// ====== 404 handler ======
app.use((req, res) => {
  console.warn("NO ROUTE for", req.method, req.url);
  res.status(404).send(`Not found: ${req.method} ${req.url}`);
});

// ====== Start server ======
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => console.error("Server error:", err));
process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection at:", promise, "reason:", reason));
