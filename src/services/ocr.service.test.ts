import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sharp", () => {
  const toFile = vi.fn().mockResolvedValue(undefined);

  const pipeline = {
    resize: vi.fn().mockReturnThis(),
    grayscale: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    sharpen: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toFile,
  };

  const sharp = vi.fn(() => pipeline);

  return {
    default: sharp,
  };
});

vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(),
}));

import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { extractTextFromImage } from "./ocr.service";

describe("OCR Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit prétraiter l'image puis créer un worker Tesseract en français", async () => {
    const recognize = vi.fn().mockResolvedValue({
      data: {
        text: "NOM : LUNA",
      },
    });

    const terminate = vi.fn().mockResolvedValue(undefined);

    vi.mocked(createWorker).mockResolvedValue({
      recognize,
      terminate,
    } as any);

    const result = await extractTextFromImage("test.jpg");

    expect(sharp).toHaveBeenCalledWith("test.jpg");

    expect(createWorker).toHaveBeenCalledWith("fra");

    expect(recognize).toHaveBeenCalled();

    expect(result).toBe("NOM : LUNA");

    expect(terminate).toHaveBeenCalled();
  });
});
