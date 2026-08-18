import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import dogRoutes from "./routes/dog.routes";
import authRoutes from "./routes/auth.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
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

/*** Dog Routes */
app.use("/api/dogs", dogRoutes);

app.listen(PORT, () => {
  console.log(`API démarrée sur http://localhost:${PORT}`);
});
