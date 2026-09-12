import { createWorker } from "tesseract.js";

/**
 * Effectue une reconnaissance OCR sur un fichier image.
 *
 * @param filePath Chemin du fichier à analyser
 * @returns Texte reconnu par Tesseract
 */
export async function extractTextFromImage(filePath: string): Promise<string> {
  const worker = await createWorker("fra");

  try {
    const result = await worker.recognize(filePath);

    return result.data.text;
  } finally {
    await worker.terminate();
  }
}
