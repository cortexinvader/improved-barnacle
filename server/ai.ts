
import type { Express } from "express";
import { db } from "./db";
import { chatMessages } from "../shared/schema";

interface CustomAIRequest {
  message: string;
  roomId: string;
  context?: string;
}

interface CustomAIResponse {
  response: string;
}

export async function sendToCustomAI(
  message: string,
  context?: string
): Promise<string> {
  // Load config from config.json
  const config = JSON.parse(
    await import("fs").then(fs => fs.promises.readFile("config.json", "utf-8"))
  );
  
  const API_ENDPOINT = config.aiApi.endpoint;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        context,
        // Add any other parameters your API needs
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data: CustomAIResponse = await response.json();
    return data.response;
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
