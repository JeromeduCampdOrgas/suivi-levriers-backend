import { createWorker } from "tesseract.js";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Prétraite une image avant OCR.
 *
 * Objectif :
 * - agrandir l'image si nécessaire
 * - passer en niveaux de gris
 * - améliorer le contraste
 * - accentuer légèrement les caractères
 * - produire une image PNG propre pour Tesseract
 */
async function preprocessImage(inputPath: string): Promise<string> {
  const tempPath = path.join(
    os.tmpdir(),
    `icad-ocr-${Date.now()}-${Math.round(Math.random() * 1_000_000)}.png`
  );

  await sharp(inputPath)
    .resize({
      width: 2400,
      withoutEnlargement: false,
      fit: "inside",
    })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toFile(tempPath);

  return tempPath;
}

/**
 * Effectue une reconnaissance OCR sur un fichier image.
 *
 * L'image est d'abord prétraitée avec Sharp afin d'améliorer
 * la qualité de reconnaissance de Tesseract.
 *
 * @param filePath Chemin du fichier image à analyser
 * @returns Texte reconnu par Tesseract
 */
export async function extractTextFromImage(filePath: string): Promise<string> {
  const processedPath = await preprocessImage(filePath);

  const worker = await createWorker("fra");

  try {
    const result = await worker.recognize(processedPath);

    return result.data.text;
  } finally {
    await worker.terminate();

    try {
      await fs.unlink(processedPath);
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;

      if (code !== "ENOENT") {
        console.error(
          "Impossible de supprimer l'image OCR temporaire :",
          error
        );
      }
    }
  }
}
