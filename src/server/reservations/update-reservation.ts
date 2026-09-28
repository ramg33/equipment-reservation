import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";
import {
  assertItemsAvailable,
  assertLocationAndEquipment,
  assertUniqueEquipment,
  parseInterval,
} from "@/server/reservations/reservation-rules";
import type { ReservationStatusValue } from "@/types/reservation";

export async function updateReservation(
  reservationId: string,
  input: CreateReservationInput,
): Promise<{ id: string; status: ReservationStatusValue }> {
  const { startAt, endAt } = parseInterval(input);
  assertUniqueEquipment(input.items);

  // Availability check and update share one transaction so concurrent confirmations can't oversell.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true },
    });

    if (!existing) {
      throw new DomainError(
        "Reservation not found.",
        404,
        "RESERVATION_NOT_FOUND",
      );
    }

    const namesById = await assertLocationAndEquipment(
      tx,
      input.locationId,
      input.items,
    );

    if (input.status === "CONFIRMED") {
      await assertItemsAvailable(tx, {
        locationId: input.locationId,
        startAt,
        endAt,
        items: input.items,
        namesById,
        excludeReservationId: reservationId,
      });
    }

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        locationId: input.locationId,
        startAt,
        endAt,
        status: input.status,
        items: {
          deleteMany: {},
          create: input.items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true, status: true },
    });
  });
}
