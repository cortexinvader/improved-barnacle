import type { Express } from "express";
import { db } from "./db";
import { chatMessages } from "../shared/schema";
import fs from "fs/promises";

interface CustomAIRequest {
  message: string;
  roomId: string;
  context?: string;
}

export async function sendToCustomAI(
  message: string,
  context?: string
): Promise<string> {
  try {
    // Load API endpoint from config.json
    const configData = await fs.readFile("config.json", "utf-8");
    const config = JSON.parse(configData);
    const API_ENDPOINT = config.aiApi.endpoint;

    // Pollinations only supports GET
    const encodedMsg = encodeURIComponent(context ? `${context} ${message}` : message);
    const response = await fetch(`${API_ENDPOINT}/${encodedMsg}`);

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.text();
    return data.trim();
  } catch (error) {
    console.error("Custom AI API error:", error);
    throw new Error("Failed to get AI response");
  }
}

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, roomId, context }: CustomAIRequest = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const aiResponse = await sendToCustomAI(message, context);

      res.json({ response: aiResponse });
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });
}
