import { extractTextFromImage } from "./ocr.service";
import {
  extractIcadData,
  type IcadExtractionResult,
} from "./icadExtractor.service";

/**
 * Effectue l'OCR d'une image ICAD puis extrait les données structurées.
 *
 * @param filePath Chemin du fichier image à analyser
 * @returns Données ICAD extraites avec le texte OCR brut
 */
export async function extractIcadFromImage(
  filePath: string
): Promise<IcadExtractionResult> {
  const rawText = await extractTextFromImage(filePath);

  return extractIcadData(rawText);
}
