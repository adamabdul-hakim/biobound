import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON payload" }, { status: 400 });
  }

  const backendUrl = process.env.TEAM_B_API_BASE_URL ?? "http://127.0.0.1:8000";

  try {
    const res = await fetch(`${backendUrl}/estimate/scan-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable. Verify TEAM_B_API_BASE_URL and server status." },
      { status: 502 },
    );
  }
}
