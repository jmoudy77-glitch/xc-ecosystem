import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function GET() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an assistant helping test OpenAI connectivity." },
        { role: "user", content: "Say hello in one sentence." }
      ],
    });

    return NextResponse.json(
      { ok: true, reply: completion.choices[0].message.content },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
