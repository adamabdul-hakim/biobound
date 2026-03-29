import { NextResponse } from "next/server";

interface TeamAAnalyzeInput {
  zipCode: string;
  productScan: string | null;
  cookwareUse: { brand: string; yearsOfUse: number } | null;
  filterModel: { brand: string; type: string } | null;
  dietHabits: {
    fiberSources: string[];
    foods: string[];
    medications: string[];
  } | null;
}

function inferProductHint(payload: TeamAAnalyzeInput): string | null {
  if (payload.productScan && !payload.productScan.startsWith("data:")) {
    return payload.productScan;
  }

  if (payload.cookwareUse?.brand) {
    return payload.cookwareUse.brand;
  }

  return null;
}

export async function POST(request: Request) {
  let payload: TeamAAnalyzeInput;

  try {
    payload = (await request.json()) as TeamAAnalyzeInput;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid JSON payload",
        },
      },
      { status: 400 },
    );
  }

  const teamBBaseUrl = process.env.TEAM_B_API_BASE_URL ?? "http://127.0.0.1:8000";
  const teamBRequest = {
    product_name_hint: inferProductHint(payload),
    image_base64:
      payload.productScan && payload.productScan.startsWith("data:")
        ? payload.productScan
        : undefined,
  };

  try {
    const backendResponse = await fetch(`${teamBBaseUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teamBRequest),
      cache: "no-store",
    });

    const responseBody = await backendResponse.json();
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Team B backend is unreachable. Verify TEAM_B_API_BASE_URL and server status.",
        },
      },
      { status: 502 },
    );
  }
}
