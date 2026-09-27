import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";

interface AvailabilityInput {
  locationId: string;
  equipmentId: string;
  startAt: Date;
  endAt: Date;
}

interface AvailabilityCheckInput extends AvailabilityInput {
  requestedQuantity: number;
}

interface Booking {
  startAt: Date;
  endAt: Date;
  quantity: number;
}

type Event = {
  timestamp: number;
  quantityChange: number;
};

function peakConcurrentQuantity(bookings: Booking[]): number {
  const events: Event[] = bookings.flatMap((booking) => [
    {
      timestamp: booking.startAt.getTime(),
      quantityChange: booking.quantity,
    },
    {
      timestamp: booking.endAt.getTime(),
      quantityChange: -booking.quantity,
    },
  ]);

  events.sort(
    (a, b) => a.timestamp - b.timestamp || a.quantityChange - b.quantityChange,
  );

  let currentQuantity = 0;
  let peakQuantity = 0;

  for (const event of events) {
    currentQuantity += event.quantityChange;
    peakQuantity = Math.max(peakQuantity, currentQuantity);
  }

  return peakQuantity;
}

export async function getAvailableQuantity(
  input: AvailabilityInput,
  db: Prisma.TransactionClient = prisma,
): Promise<number> {
  if (input.endAt <= input.startAt) {
    throw new DomainError(
      "End time must be after start time.",
      400,
      "INVALID_INTERVAL",
    );
  }

  const equipment = await db.equipment.findFirst({
    where: { id: input.equipmentId, locationId: input.locationId },
    select: { totalQuantity: true },
  });

  if (!equipment) {
    throw new DomainError(
      "Equipment was not found at the selected location.",
      404,
      "EQUIPMENT_NOT_FOUND",
    );
  }

  const reservations = await db.reservation.findMany({
    where: {
      locationId: input.locationId,
      status: "CONFIRMED",
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      items: { some: { equipmentId: input.equipmentId } },
    },
    select: {
      startAt: true,
      endAt: true,
      items: {
        where: { equipmentId: input.equipmentId },
        select: { quantity: true },
      },
    },
  });

  const bookings = reservations.flatMap((reservation) =>
    reservation.items.map((item) => ({
      startAt:
        reservation.startAt > input.startAt
          ? reservation.startAt
          : input.startAt,
      endAt: reservation.endAt < input.endAt ? reservation.endAt : input.endAt,
      quantity: item.quantity,
    })),
  );

  return Math.max(
    0,
    equipment.totalQuantity - peakConcurrentQuantity(bookings),
  );
}

export async function checkAvailability(
  input: AvailabilityCheckInput,
  db: Prisma.TransactionClient = prisma,
): Promise<{ available: boolean; availableQuantity: number }> {
  if (
    !Number.isInteger(input.requestedQuantity) ||
    input.requestedQuantity <= 0
  ) {
    throw new DomainError(
      "Quantity must be a positive whole number.",
      400,
      "INVALID_QUANTITY",
    );
  }

  const availableQuantity = await getAvailableQuantity(input, db);
  return {
    available: input.requestedQuantity <= availableQuantity,
    availableQuantity,
  };
}
