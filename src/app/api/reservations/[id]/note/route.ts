import { NextResponse } from "next/server";
import { handleJson } from "@/lib/api-handler";
import { reservationNoteSchema } from "@/schemas/reservation-note";
import { updateReservationNote } from "@/server/reservations/update-reservation-note";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  return handleJson(
    request,
    reservationNoteSchema,
    async (input) => {
      const reservation = await updateReservationNote(id, input);
      return NextResponse.json({ reservation });
    },
    {
      logLabel: "Unexpected reservation note error",
      fallbackMessage: "The note could not be saved. Please try again.",
    },
  );
}
