console.log("================");
console.log("SCRIPT STARTING");
console.log("================");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const path = require("path"); 
const LOGS = [];

// Immediate console output to verify script is running
console.log("Script started");

// Enhanced debugging
console.log("Starting server initialization...");

// Load environment variables (if .env exists)
dotenv.config();
console.log("Environment variables loaded");

const app = express();
console.log("Express app created");

app.use(cors());
app.use(express.json());


app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  console.log("Received login request");
  console.log("Email:", email);
  console.log("Password:", password);

  res.json({
    success: true,
    message: "Login successful",
    user: { email }
  });
});


app.use(express.static(path.join(__dirname, "..", "frontend")));

//  send index.html at the root instead of plain text
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});


app.get("/games/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=8&ordering=-rating&key=${process.env.RAWG_KEY}`;


    const rawgResponse = await fetch(url);
    const data = await rawgResponse.json();

    const formatted = (data.results || []).slice(0, 8).map(game => ({
      id: game.id,
      name: game.name,
      year: game.released ? game.released.slice(0, 4) : "",
      image: game.background_image || ""
    }));

    res.json(formatted);

  } catch (error) {
    console.error("RAWG API error:", error);
    res.status(500).json({ error: "Failed to fetch from RAWG API" });
  }
});

app.post('/logs', (req, res) => {
  console.log('LOG ENTRY:', req.body);
  res.json({ ok: true, id: Date.now(), ...req.body });
});



// RAWG proxy: /games/search?q=zelda
app.get("/games/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    if (!process.env.RAWG_KEY) {
      console.error("Missing RAWG_KEY in .env");
      return res.status(500).json({ error: "RAWG key not configured" });
    }

    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=8&key=${process.env.RAWG_KEY}`;
    console.log("RAWG URL:", url);

    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      console.error("RAWG error:", r.status, text);
      return res.status(502).json({ error: "RAWG request failed" });
    }

    const data = await r.json();
    const out = (data.results || []).map(g => ({
      id: g.id,
      name: g.name,
      year: (g.released || "").slice(0, 4),
      image: g.background_image
    }));
    res.json(out);
  } catch (err) {
    console.error("Search route failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});



const PORT = process.env.PORT || 3000;
console.log(`Port selected: ${PORT}`);

app.use(express.static(path.join(__dirname, "../frontend")));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (error) => {
  console.error('Server failed to start:', error);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Additional error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});