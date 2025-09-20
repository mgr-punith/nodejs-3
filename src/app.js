import express, { json } from "express";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(json());

// Routes
app.use("/api", authRoutes);

// check
app.get("/health", (req, res) => res.json({ status: "ok" }));

export default app;
