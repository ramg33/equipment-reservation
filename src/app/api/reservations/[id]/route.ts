import { NextResponse } from "next/server";
import { handleJson } from "@/lib/api-handler";
import { createReservationSchema } from "@/schemas/create-reservation";
import { updateReservation } from "@/server/reservations/update-reservation";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  return handleJson(
    request,
    createReservationSchema,
    async (input) => {
      const reservation = await updateReservation(id, input);
      return NextResponse.json({ reservation });
    },
    {
      logLabel: "Unexpected update reservation error",
      fallbackMessage: "The reservation could not be updated. Please try again.",
    },
  );
}
