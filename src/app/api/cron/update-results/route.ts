import { runOpenAiResultUpdate } from "@/lib/openai-results";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedAuth = secret ? ["Bearer", secret].join(" ") : null;

  if (!secret || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runOpenAiResultUpdate();
  return NextResponse.json(summary);
}
