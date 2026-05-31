import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";

const forecastSchema = z.object({
  productId: z.string().uuid(),
  currentStock: z.number().int().nonnegative(),
  historicalMovements: z.array(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = forecastSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { productId, currentStock, historicalMovements } = validation.data;

    // Check if Anthropic API Key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "mock-key") {
      // Fallback realistic Claude simulation
      const mockForecast = `### Demand Forecast & Inventory Recommendation\n\n**Analysis of Movement Patterns:**\n* Based on a 90-day historic ledger, Grade A Steel Rods have an average daily velocity of **8.3 units/day**.\n* Seasonality checks indicate a **14% spike in demand** during late fiscal quarters due to retail construction cycles.\n\n**Replenishment Suggestion:**\n* **Current Stock Level:** ${currentStock} units\n* **Safety Level Mark:** 100 units\n* **Recommended Purchase Order Quantity:** **250 units** to capitalize on Apex Materials' bulk shipping discount.\n* **Ordering Window:** Initiate procurement immediately. Expected Lead Time is 7 days, which prevents total depletion.`;
      
      return NextResponse.json({
        data: {
          forecast: mockForecast,
        },
        error: null,
        meta: { mock: true },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are an expert SCM AI Forecasting Assistant.
    Analyze the following product stock levels and history to recommend optimal procurement and timings.
    - Product ID: ${productId}
    - Current Stock Level: ${currentStock} units
    - Historical Movement ledger (last 90 days): ${JSON.stringify(historicalMovements || [])}
    
    Structure your response under sections:
    1. Analysis of Movement Patterns (velocity, daily usage, seasonality spikes)
    2. Replenishment Suggestion (recommended reorder volume and timing context)`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // standard modern Claude model in SDK
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const forecastOutput = msg.content[0].type === "text" ? msg.content[0].text : "";

    return NextResponse.json({
      data: {
        forecast: forecastOutput,
      },
      error: null,
      meta: null,
    });
  } catch (error: any) {
    console.error("AI Forecast error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
