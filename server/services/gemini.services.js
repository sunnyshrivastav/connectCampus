import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const Gemini_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  
export const summarizePDF = async (text) => {
  if (!text) {
    throw new Error("No text provided for summarization");
  }

  const prompt = `
Analyze the following text extracted from a PDF and provide a structured JSON response.

The JSON should have these keys:
- "summary"
- "keyPoints" (array of strings)
- "questions" (array of objects with "question" and "answer")

Text:
${text.substring(0, 10000)}

Response must be ONLY valid JSON.
`;

  return await generateGeminiResponse(prompt);
};

// ✅ Main Gemini function
export const generateGeminiResponse = async (prompt) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in environment variables");
    }

    console.log("✅ Prompt length:", prompt.length);

    const response = await axios.post(
      `${Gemini_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    // ✅ Safe extraction
    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("❌ Gemini Raw Response:", response.data);
      throw new Error("No text returned from Gemini");
    }

    // ✅ Clean response
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // ✅ Try parsing JSON
    try {
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.warn("⚠️ JSON Parse Failed, returning raw text");
      console.warn("Cleaned Text:", cleanText);
      return cleanText;
    }
  } catch (error) {
    if (error.response) {
      console.error("❌ Gemini API Error:", error.response.data);
      throw new Error(
        `Gemini API Error: ${error.response.status} - ${JSON.stringify(
          error.response.data
        )}`
      );
    } else if (error.request) {
      console.error("❌ Network Error:", error.message);
      throw new Error(
        `Network Error: Unable to reach Gemini API. ${error.message}`
      );
    } else {
      console.error("❌ Request Setup Error:", error.message);
      throw new Error(`Request Error: ${error.message}`);
    }
  }
};