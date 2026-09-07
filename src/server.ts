import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import dogRoutes from "./routes/dog.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 4000;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "API Suivi Lévriers opérationnelle",
  });
});

/********* Routes *********/

/*** User Routes */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/*** Dog Routes */
app.use("/api/dogs", dogRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API démarrée sur le port ${PORT}`);
});
