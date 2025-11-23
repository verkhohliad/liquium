/**
 * Liquium Backend API
 * Express server for deal management, event indexing, and user data
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dealsRouter } from "./routes/deals";
import { usersRouter } from "./routes/users";
import { rewardsRouter } from "./routes/rewards";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/deals", dealsRouter);
app.use("/api/users", usersRouter);
app.use("/api/rewards", rewardsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Liquium API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
