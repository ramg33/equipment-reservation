import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import { toUtcDate, type CreateReservationInput } from "@/schemas/create-reservation";
import { checkAvailability } from "@/server/reservations/availability";
import type { ReservationStatusValue } from "@/types/reservation";

export async function createReservation(
  input: CreateReservationInput,
): Promise<{ id: string; status: ReservationStatusValue }> {
  const startAt = toUtcDate(input.startAt);
  const endAt = toUtcDate(input.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  const equipmentIds = input.items.map((item) => item.equipmentId);
  if (new Set(equipmentIds).size !== equipmentIds.length) {
    throw new DomainError(
      "Each equipment type can only be added once per reservation.",
      400,
      "DUPLICATE_EQUIPMENT",
    );
  }

  // Availability check and insert share one transaction so concurrent confirmations can't oversell.
  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: input.locationId },
      select: { id: true },
    });

    if (!location) {
      throw new DomainError("Location not found.", 404, "LOCATION_NOT_FOUND");
    }

    const equipment = await tx.equipment.findMany({
      where: { id: { in: equipmentIds }, locationId: input.locationId },
      select: { id: true, name: true },
    });

    if (equipment.length !== equipmentIds.length) {
      throw new DomainError(
        "One or more equipment items are not available at the selected location.",
        400,
        "EQUIPMENT_NOT_AT_LOCATION",
      );
    }

    if (input.status === "CONFIRMED") {
      const namesById = new Map(equipment.map((item) => [item.id, item.name]));

      for (const item of input.items) {
        const { available, availableQuantity } = await checkAvailability(
          {
            locationId: input.locationId,
            equipmentId: item.equipmentId,
            startAt,
            endAt,
            requestedQuantity: item.quantity,
          },
          tx,
        );

        if (!available) {
          throw new DomainError(
            formatUnavailableMessage(namesById.get(item.equipmentId) ?? "items", availableQuantity),
            409,
            "INSUFFICIENT_AVAILABILITY",
          );
        }
      }
    }

    return tx.reservation.create({
      data: {
        locationId: input.locationId,
        startAt,
        endAt,
        status: input.status,
        items: {
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

function formatUnavailableMessage(name: string, availableQuantity: number): string {
  if (availableQuantity === 0) {
    return `No ${name}s are available for the selected period.`;
  }
  if (availableQuantity === 1) {
    return `Only 1 ${name} is available for the selected period.`;
  }
  return `Only ${availableQuantity} ${name}s are available for the selected period.`;
}
