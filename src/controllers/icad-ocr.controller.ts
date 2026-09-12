import type { Request, Response } from "express";
import fs from "fs/promises";

import { extractIcadFromImage } from "../services/icadOcr.service";

export async function extractIcadOcrController(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      message: "Aucun fichier image fourni.",
    });
    return;
  }

  const filePath = req.file.path;

  try {
    const result = await extractIcadFromImage(filePath);

    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur OCR ICAD :", error);

    res.status(500).json({
      message: "Erreur lors de l'analyse OCR de la carte ICAD.",
    });
  } finally {
    // Le fichier temporaire n'est pas conservé après l'OCR.
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(
        "Impossible de supprimer le fichier temporaire OCR :",
        error
      );
    }
  }
}
