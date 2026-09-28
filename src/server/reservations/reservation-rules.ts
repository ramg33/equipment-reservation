import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain-error";
import { toUtcDate, type CreateReservationInput } from "@/schemas/create-reservation";
import { checkAvailability } from "@/server/reservations/availability";

type ReservationItems = CreateReservationInput["items"];

export function parseInterval(input: Pick<CreateReservationInput, "startAt" | "endAt">): {
  startAt: Date;
  endAt: Date;
} {
  const startAt = toUtcDate(input.startAt);
  const endAt = toUtcDate(input.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  return { startAt, endAt };
}

export function assertUniqueEquipment(items: ReservationItems): void {
  const equipmentIds = items.map((item) => item.equipmentId);
  if (new Set(equipmentIds).size !== equipmentIds.length) {
    throw new DomainError(
      "Each equipment type can only be added once per reservation.",
      400,
      "DUPLICATE_EQUIPMENT",
    );
  }
}

/** Verifies the location exists and every item belongs to it; returns equipment names by id. */
export async function assertLocationAndEquipment(
  tx: Prisma.TransactionClient,
  locationId: string,
  items: ReservationItems,
): Promise<Map<string, string>> {
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { id: true },
  });

  if (!location) {
    throw new DomainError("Location not found.", 404, "LOCATION_NOT_FOUND");
  }

  const equipmentIds = items.map((item) => item.equipmentId);
  const equipment = await tx.equipment.findMany({
    where: { id: { in: equipmentIds }, locationId },
    select: { id: true, name: true },
  });

  if (equipment.length !== equipmentIds.length) {
    throw new DomainError(
      "One or more equipment items are not available at the selected location.",
      400,
      "EQUIPMENT_NOT_AT_LOCATION",
    );
  }

  return new Map(equipment.map((item) => [item.id, item.name]));
}

export async function assertItemsAvailable(
  tx: Prisma.TransactionClient,
  input: {
    locationId: string;
    startAt: Date;
    endAt: Date;
    items: ReservationItems;
    namesById: Map<string, string>;
    excludeReservationId?: string;
  },
): Promise<void> {
  for (const item of input.items) {
    const { available, availableQuantity } = await checkAvailability(
      {
        locationId: input.locationId,
        equipmentId: item.equipmentId,
        startAt: input.startAt,
        endAt: input.endAt,
        requestedQuantity: item.quantity,
        excludeReservationId: input.excludeReservationId,
      },
      tx,
    );

    if (!available) {
      throw new DomainError(
        formatUnavailableMessage(input.namesById.get(item.equipmentId) ?? "items", availableQuantity),
        409,
        "INSUFFICIENT_AVAILABILITY",
      );
    }
  }
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
