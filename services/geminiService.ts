
import { GoogleGenAI } from "@google/genai";
import { Language, OrderItem } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY || ''; 
  // In a real app, we would handle missing keys more gracefully. 
  // For this demo, we assume the environment is set up correctly as per instructions.
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a marketing description for a pet product in a specific language.
 */
export const generateProductDescription = async (
  productName: string, 
  category: string,
  targetLang: Language
): Promise<string> => {
  try {
    const ai = getAiClient();
    const langName = targetLang === Language.RU ? 'Russian' : 'Ukrainian';
    
    const prompt = `
      You are a professional copywriter for a pet store called "my-dog.com.ua".
      Write a compelling, SEO-friendly product description (approx 50-80 words) for a product.
      
      Product Name: ${productName}
      Category: ${category}
      Target Language: ${langName}
      
      Format: Plain text, no markdown. Tone: Friendly, professional, caring about pets.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Description could not be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating description. Please check API Key.";
  }
};

/**
 * Analyzes sales trends based on provided data.
 */
export const analyzeSalesData = async (salesSummary: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      Analyze the following sales summary for a pet store and provide 3 brief strategic recommendations (bullet points).
      Data: ${salesSummary}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini Analytics Error:", error);
    return "Analysis failed.";
  }
};

/**
 * Suggests packaging for an order.
 */
export const getShippingAdvice = async (items: OrderItem[], lang: Language): Promise<string> => {
  try {
    const ai = getAiClient();
    const itemsList = items.map(i => `${i.quantity} x ${i.productName}`).join(', ');
    const langName = lang === Language.RU ? 'Russian' : 'Ukrainian';

    const prompt = `
      You are a warehouse logistics expert.
      Recommend the optimal packaging box size (Small, Medium, Large) and padding material for shipping these pet products safely.
      Items: ${itemsList}
      Language: ${langName}
      Keep it short (1-2 sentences).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Advice unavailable.";
  } catch (error) {
    console.error("Gemini Shipping Error:", error);
    return "Could not generate shipping advice.";
  }
};
