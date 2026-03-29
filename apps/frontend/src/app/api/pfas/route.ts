import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const zipCode = url.searchParams.get("zip_code");

  if (!zipCode) {
    return NextResponse.json({ detail: "Missing required query param: zip_code" }, { status: 400 });
  }

  const backendUrl = process.env.TEAM_B_API_BASE_URL ?? "http://127.0.0.1:8000";

  try {
    const res = await fetch(
      `${backendUrl}/estimate/pfas?zip_code=${encodeURIComponent(zipCode)}`,
      { cache: "no-store" },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable. Verify TEAM_B_API_BASE_URL and server status." },
      { status: 502 },
    );
  }
}
