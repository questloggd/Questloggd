console.log("================");
console.log("SCRIPT STARTING");
console.log("================");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const path = require("path"); 

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

const PORT = process.env.PORT || 3000;
console.log(`Port selected: ${PORT}`);

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