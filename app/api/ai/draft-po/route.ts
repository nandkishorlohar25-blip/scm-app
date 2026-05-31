import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";

const draftPoSchema = z.object({
  lowStockItems: z.array(
    z.object({
      id: z.string().uuid(),
      sku: z.string(),
      name: z.string(),
      reorderPoint: z.number().int(),
      reorderQty: z.number().int(),
      costPrice: z.number().int(),
      preferredSupplierId: z.string().uuid(),
    })
  ).min(1, "Must provide at least one low-stock item"),
});

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("MANAGER");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = draftPoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { lowStockItems } = validation.data;

    // Check if Anthropic API Key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "mock-key") {
      // Fallback realistic Claude JSON draft PO simulation
      const mockDraft = [
        {
          supplierId: lowStockItems[0].preferredSupplierId,
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Auto-drafted by Claude SCM Assistant. Items fell below safety reorder marks.",
          lines: lowStockItems.map((item) => ({
            productId: item.id,
            sku: item.sku,
            name: item.name,
            quantityOrdered: item.reorderQty,
            unitCost: item.costPrice,
          })),
        },
      ];

      return NextResponse.json({
        data: {
          drafts: mockDraft,
        },
        error: null,
        meta: { mock: true },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are an expert SCM AI Auto-Drafting assistant.
    Review the following low-stock products and preferred suppliers. Group them by supplier, calculate optimal order quantities, and draft a list of purchase orders.
    
    Low Stock Items: ${JSON.stringify(lowStockItems)}
    
    You must output a valid JSON array matching this schema:
    [
      {
        "supplierId": "string (uuid)",
        "expectedDeliveryDate": "string (ISO date)",
        "notes": "string",
        "lines": [
          {
            "productId": "string (uuid)",
            "sku": "string",
            "name": "string",
            "quantityOrdered": number,
            "unitCost": number (cents/paise integer)
          }
        ]
      }
    ]
    
    Output ONLY the raw JSON block. Do not wrap in markdown or add conversational notes.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const outputText = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const parsedDrafts = JSON.parse(outputText);

    return NextResponse.json({
      data: {
        drafts: parsedDrafts,
      },
      error: null,
      meta: null,
    });
  } catch (error: any) {
    console.error("AI Draft PO error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
