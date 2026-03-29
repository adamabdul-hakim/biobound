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
  makeUpUse: {
    frequency: "never" | "rarely" | "weekly" | "daily";
    productTypes: string[];
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidPayload(value: unknown): value is TeamAAnalyzeInput {
  if (!isRecord(value)) {
    return false;
  }

  const zipCode = value.zipCode;
  if (typeof zipCode !== "string" || !/^\d{5}$/.test(zipCode)) {
    return false;
  }

  if (!(value.productScan === null || typeof value.productScan === "string")) {
    return false;
  }

  if (
    !(
      value.cookwareUse === null ||
      (isRecord(value.cookwareUse) &&
        typeof value.cookwareUse.brand === "string" &&
        typeof value.cookwareUse.yearsOfUse === "number")
    )
  ) {
    return false;
  }

  if (
    !(
      value.filterModel === null ||
      (isRecord(value.filterModel) &&
        typeof value.filterModel.brand === "string" &&
        typeof value.filterModel.type === "string")
    )
  ) {
    return false;
  }

  if (
    !(
      value.dietHabits === null ||
      (isRecord(value.dietHabits) &&
        isStringArray(value.dietHabits.fiberSources) &&
        isStringArray(value.dietHabits.foods) &&
        isStringArray(value.dietHabits.medications))
    )
  ) {
    return false;
  }

  if (
    !(
      value.makeUpUse === null ||
      (isRecord(value.makeUpUse) &&
        ["never", "rarely", "weekly", "daily"].includes(
          String(value.makeUpUse.frequency),
        ) &&
        isStringArray(value.makeUpUse.productTypes))
    )
  ) {
    return false;
  }

  return true;
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
  let payload: unknown;

  try {
    payload = await request.json();
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

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Invalid analyze payload. Expected zipCode, optional productScan, cookwareUse, filterModel, dietHabits, and makeUpUse fields.",
        },
      },
      { status: 422 },
    );
  }

  const teamBBaseUrl = process.env.TEAM_B_API_BASE_URL ?? "http://127.0.0.1:8000";
  const teamBRequest = {
    zip_code: payload.zipCode,
    product_scan: payload.productScan,
    cookware_use: payload.cookwareUse
      ? {
          brand: payload.cookwareUse.brand,
          years_of_use: payload.cookwareUse.yearsOfUse,
        }
      : null,
    filter_model: payload.filterModel,
    diet_habits: payload.dietHabits
      ? {
          fiber_sources: payload.dietHabits.fiberSources,
          foods: payload.dietHabits.foods,
          medications: payload.dietHabits.medications,
        }
      : null,
    make_up_use: payload.makeUpUse
      ? {
          frequency: payload.makeUpUse.frequency,
          product_types: payload.makeUpUse.productTypes,
        }
      : null,
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
