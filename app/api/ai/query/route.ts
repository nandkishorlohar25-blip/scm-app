import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";

const querySchema = z.object({
  question: z.string().min(3, "Question must be at least 3 characters"),
});

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = querySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { question } = validation.data;

    // 1. Load all active products and warehouse stocks to evaluate
    const products = await prisma.product.findMany({
      where: {
        orgId,
        isActive: true,
      },
      include: {
        inventoryItems: {
          include: {
            warehouse: {
              select: { name: true },
            },
          },
        },
      },
    });

    const productsDataSet = products.map((p) => {
      const totalStock = p.inventoryItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
      return {
        sku: p.sku,
        name: p.name,
        category: p.category,
        totalStock,
        reorderPoint: p.reorderPoint,
        unitOfMeasure: p.unitOfMeasure,
        type: p.type,
      };
    });

    // Check if Anthropic API Key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "mock-key") {
      // Fallback realistic Claude query answer
      const mockAnswer = `### Claude SCM Assistant Answer\n\nBased on a scan of the active database records, here are the products matching your query **"${question}"**:\n\n1. **RAW-STL-002 (Grade A Steel Rods)**\n   * **Current Stock:** 45 pieces\n   * **Safety Point:** 100 pieces\n   * **Location:** Primary Warehouse\n   * *Recommendation:* Stock is severely depleted and will likely run out within the week. Initiate PO immediately.\n\n2. **PKG-BOX-M (Medium Cardboard Boxes)**\n   * **Current Stock:** 200 pieces\n   * **Safety Point:** 250 pieces\n   * *Recommendation:* Replenishment is required. Lead time is 5 days, order today to prevent outage.`;

      return NextResponse.json({
        data: {
          answer: mockAnswer,
        },
        error: null,
        meta: { mock: true },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are the core SCM Command Center AI Assistant.
    Analyze the active product stock data set to answer this user's natural language question:
    Question: "${question}"
    
    Active Product Dataset:
    ${JSON.stringify(productsDataSet)}
    
    Structure your answer in standard Markdown:
    - Summarize which products match the search filter.
    - Provide stock levels, reorder benchmarks, and active recommendations.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const answerOutput = msg.content[0].type === "text" ? msg.content[0].text : "";

    return NextResponse.json({
      data: {
        answer: answerOutput,
      },
      error: null,
      meta: null,
    });
  } catch (error: any) {
    console.error("AI Natural Query error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
