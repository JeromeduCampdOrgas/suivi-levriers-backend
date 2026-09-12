import { describe, expect, it, vi } from "vitest";

vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(),
}));

import { createWorker } from "tesseract.js";
import { extractTextFromImage } from "./ocr.service";

describe("OCR Service", () => {
  it("doit créer un worker Tesseract en français", async () => {
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

    expect(createWorker).toHaveBeenCalledWith("fra");
    expect(recognize).toHaveBeenCalledWith("test.jpg");
    expect(result).toBe("NOM : LUNA");

    expect(terminate).toHaveBeenCalled();
  });
});
