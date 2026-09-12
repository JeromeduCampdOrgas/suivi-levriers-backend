import { describe, expect, it, vi } from "vitest";

vi.mock("./ocr.service", () => ({
  extractTextFromImage: vi.fn(),
}));

vi.mock("./icadExtractor.service", () => ({
  extractIcadData: vi.fn(),
}));

import { extractTextFromImage } from "./ocr.service";
import { extractIcadData } from "./icadExtractor.service";
import { extractIcadFromImage } from "./icadOcr.service";

describe("ICAD OCR Service", () => {
  it("doit enchaîner OCR et extraction ICAD", async () => {
    const rawText = `
      NOM : LUNA
      PRENOM : MARIE
      SEXE : FEMELLE
      DATE DE NAISSANCE : 12/05/2021
      RACE : GALGO ESPAGNOL
    `;

    const extractionResult = {
      data: {
        nom: {
          value: "LUNA",
          confidence: 1,
        },
        prenom: {
          value: "MARIE",
          confidence: 1,
        },
        sexe: {
          value: "FEMELLE",
          confidence: 1,
        },
        dateNaissance: {
          value: "12/05/2021",
          confidence: 1,
        },
        race: {
          value: "GALGO ESPAGNOL",
          confidence: 1,
        },
      },
      rawText,
      normalizedText: rawText.toUpperCase(),
    };

    vi.mocked(extractTextFromImage).mockResolvedValue(rawText);
    vi.mocked(extractIcadData).mockReturnValue(extractionResult as any);

    const result = await extractIcadFromImage("test.jpg");

    expect(extractTextFromImage).toHaveBeenCalledWith("test.jpg");
    expect(extractIcadData).toHaveBeenCalledWith(rawText);
    expect(result).toEqual(extractionResult);
  });
});
