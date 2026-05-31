import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";

const riskSchema = z.object({
  supplierId: z.string().uuid(),
  orderHistory: z.array(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const userContext = await requireRole("VIEWER");
    const { orgId } = userContext;

    const body = await req.json().catch(() => ({}));
    const validation = riskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ data: null, error: validation.error.format(), meta: null }, { status: 400 });
    }

    const { supplierId, orderHistory } = validation.data;

    // Check if Anthropic API Key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "mock-key") {
      const mockAnalysis = `### Supplier Reliability & Risk Assessment\n\n**Reliability Score:** **9.2 / 10** (Low Risk Category)\n\n**Key Risk Indicators Evaluated:**\n* **Fulfillment Accuracy:** 98.4% of PO items received match quantity requirements without deviations.\n* **Lead Time Variance:** Average variance is **+/- 0.8 days** on a 7-day lead commitment, indicating excellent logistics discipline.\n* **Financial stability:** Net-30 credit terms have been fully cleared on time historically.\n\n**Strategic Mitigation Advice:**\n* Highly recommended for primary sourcing. To hedge against regional freight terminal bottlenecks during winter peaks, maintain a 10% safety buffer for steel rods in the Primary Warehouse.`;

      return NextResponse.json({
        data: {
          riskAnalysis: mockAnalysis,
        },
        error: null,
        meta: { mock: true },
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a professional SCM Risk Auditor.
    Evaluate the reliability of this supplier based on their corporate profile and purchase order history:
    - Supplier ID: ${supplierId}
    - Order History logs: ${JSON.stringify(orderHistory || [])}
    
    Structure your audit under sections:
    1. Reliability Score (value from 1 to 10 with category classification)
    2. Key Risk Indicators Evaluated (delivery timelines variance, item accuracy rates, terms stability)
    3. Strategic Mitigation Advice (backup vendors suggestions or stock buffering)`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const reportOutput = msg.content[0].type === "text" ? msg.content[0].text : "";

    return NextResponse.json({
      data: {
        riskAnalysis: reportOutput,
      },
      error: null,
      meta: null,
    });
  } catch (error: any) {
    console.error("AI Supplier Risk error:", error);
    const statusCode = error.statusCode || 500;
    return NextResponse.json({ data: null, error: error.message || "Internal server error", meta: null }, { status: statusCode });
  }
}
