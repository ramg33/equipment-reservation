import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";

// `datetime-local` wall-clock value in UTC, e.g. 2027-09-20T09:00 (inverse of `toUtcDate`).
function toUtcInputValue(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export async function getReservationFormValues(
  reservationId: string,
): Promise<CreateReservationInput | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      locationId: true,
      startAt: true,
      endAt: true,
      status: true,
      items: {
        orderBy: { equipment: { name: "asc" } },
        select: { equipmentId: true, quantity: true },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  return {
    locationId: reservation.locationId,
    startAt: toUtcInputValue(reservation.startAt),
    endAt: toUtcInputValue(reservation.endAt),
    status: reservation.status,
    items: reservation.items,
  };
}
