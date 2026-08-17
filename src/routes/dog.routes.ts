import { Router } from "express";
import { getDogs } from "../controllers/dog.controller";

const router = Router();

router.get("/", getDogs);

export default router;
