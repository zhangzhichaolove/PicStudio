import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageWithGemini = async (
  base64Image: string,
  mimeType: string,
  language: string = 'en'
): Promise<AIAnalysisResult> => {
  const ai = getGeminiClient();

  // Clean base64 string if it contains header
  const cleanBase64 = base64Image.includes('base64,')
    ? base64Image.split('base64,')[1]
    : base64Image;

  const langInstruction = language === 'zh' ? 'Respond in Chinese (Simplified).' : 'Respond in English.';
  const prompt = `Analyze this image for SEO and file management purposes. 
  Provide a concise title, a short description (alt text), relevant tags, and a suggested filename (kebab-case, without extension). ${langInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestedFilename: { type: Type.STRING }
          },
          required: ["title", "description", "tags", "suggestedFilename"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    throw error;
  }
};