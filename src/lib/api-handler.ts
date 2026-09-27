import { NextResponse } from "next/server";
import type { z } from "zod";
import { DomainError } from "@/lib/domain-error";

type ErrorBody = { error: string; code: string };

export function errorResponse(
  error: string,
  code: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error, code }, { status });
}

type HandleJsonOptions = {
  fallbackMessage: string;
  logLabel: string;
};

export async function handleJson<S extends z.ZodType>(
  request: Request,
  schema: S,
  handler: (input: z.infer<S>) => Promise<NextResponse>,
  { fallbackMessage, logLabel }: HandleJsonOptions,
): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Invalid request.",
        "VALIDATION_ERROR",
        400,
      );
    }

    return await handler(parsed.data);
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return errorResponse(error.message, error.code, error.statusCode);
    }

    if (error instanceof SyntaxError) {
      return errorResponse(
        "Request body must be valid JSON.",
        "INVALID_JSON",
        400,
      );
    }

    console.error(logLabel, error);
    return errorResponse(fallbackMessage, "INTERNAL_ERROR", 500);
  }
}
