import type { Request, Response } from "express";
import { getAllDogs } from "../services/dog.service";

export async function getDogs(_req: Request, res: Response) {
  try {
    const dogs = await getAllDogs();

    res.json(dogs);
  } catch (error) {
    console.error("Erreur lors de la récupération des lévriers :", error);

    res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}
