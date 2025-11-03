console.log("================");
console.log("SCRIPT STARTING");
console.log("================");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fetch = require("node-fetch");

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

// Simple test route
app.get("/", (req, res) => {
  console.log("Received request on root route");
  res.send("Backend is running successfully!");
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