import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Remove top-level client initialization
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function getGenAIClient() {
    const keyRecord = await db.select().from(settings).where(eq(settings.key, 'gemini_api_key')).get();
    const apiKey = keyRecord?.value || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API Key not found in settings or environment variables');
    }

    return new GoogleGenerativeAI(apiKey);
}


interface ModelConfig {
    id: string;
    label: string;
    type: 'text' | 'image';
    default?: boolean;
}

interface ModelsJson {
    text_models: ModelConfig[];
    image_models: ModelConfig[];
}

const MODELS_FILE_PATH = path.join(process.cwd(), 'data', 'models.json');

export async function generate_post_content(row_json: any, system_prompt: string, model_id: string) {
    try {
        const genAI = await getGenAIClient();
        const model = genAI.getGenerativeModel({ model: model_id });

        const prompt = `
      ${system_prompt}
      
      Input Data:
      ${JSON.stringify(row_json)}
      
      Output Format (JSON ONLY):
      {
        "title": "...",
        "content_html": "...",
        "image_prompt": "..."
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Simple cleanup to ensure JSON
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error generating post content:', error);
        // Retry logic could be implemented here or in the manager
        throw error;
    }
}

export async function generate_image_bytes(prompt: string, model_id: string): Promise<Buffer> {
    // Note: Gemini Image generation API might differ slightly depending on the specific model version and library support.
    // This is a placeholder implementation assuming a standard generation interface or future support.
    // For now, we might need to use a specific endpoint or handle it differently if the SDK doesn't fully support it yet in the same way.
    // Assuming 'imagen-3.0-generate-001' or similar for now if available, or using the model_id passed.

    // TODO: Verify exact Gemini Image Generation implementation details with current SDK version.
    // As of now, standard GoogleGenerativeAI SDK primarily supports text/multimodal input -> text output.
    // Image generation might require a different client or specific method call.
    // For the purpose of this skeleton, we will assume a hypothetical method or standard API call.

    try {
        // Placeholder for actual image generation call
        // const model = genAI.getGenerativeModel({ model: model_id });
        // const result = await model.generateImage(prompt); 
        // return Buffer.from(result.image.data, 'base64');

        console.log(`Generating image with model ${model_id} for prompt: ${prompt}`);
        // Return a mock buffer for now to allow compilation/testing without valid API key/Quota
        return Buffer.from('mock_image_data');
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

export async function sync_models() {
    try {
        // Fetch models from Google API
        // Note: listModels might return a large list. We need to filter for Gemini models.
        // The SDK might not expose listModels directly on the instance, might need ModelService.

        // For now, we will simulate syncing or just read/write the file.
        // Real implementation would use:
        // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
        // const data = await response.json();

        // WARNING: Writing to the filesystem (fs.writeFile) will NOT persist in Vercel Serverless functions.
        // If you need to update models dynamically, use a database or external storage.


        // Let's assume we fetch and merge.
        const currentModelsRaw = await fs.readFile(MODELS_FILE_PATH, 'utf-8');
        const currentModels: ModelsJson = JSON.parse(currentModelsRaw);

        // Logic to fetch from Google and merge would go here.
        // For this MVP, we'll just return the current models or log that sync happened.
        console.log('Syncing models... (Mock implementation)');

        return currentModels;
    } catch (error) {
        console.error('Error syncing models:', error);
        throw error;
    }
}
