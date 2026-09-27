import { NextResponse } from "next/server";
import { handleJson } from "@/lib/api-handler";
import { createReservationSchema } from "@/schemas/create-reservation";
import { createReservation } from "@/server/reservations/create-reservation";

export function POST(request: Request): Promise<NextResponse> {
  return handleJson(
    request,
    createReservationSchema,
    async (input) => {
      const reservation = await createReservation(input);
      return NextResponse.json({ reservation }, { status: 201 });
    },
    {
      logLabel: "Unexpected create reservation error",
      fallbackMessage: "The reservation could not be created. Please try again.",
    },
  );
}
