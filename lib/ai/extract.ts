import mammoth from "mammoth";

// @ts-expect-error - pdf-parse has no type declarations
import pdf from "pdf-parse/lib/pdf-parse.js";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return "";
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
}
