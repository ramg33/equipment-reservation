import { z } from "zod";

// Form and API send `datetime-local` wall-clock values (e.g. 2027-09-20T09:00), interpreted as UTC.
export function toUtcDate(value: string): Date {
  return new Date(`${value}Z`);
}

export const reservationItemSchema = z.object({
  equipmentId: z.string().min(1, "Select equipment."),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a number.")
    .positive("Quantity must be at least 1."),
});

export const createReservationSchema = z
  .object({
    locationId: z.string().min(1, "Select a location."),
    startAt: z.iso.datetime({
      local: true,
      error: "Enter a start date and time.",
    }),
    endAt: z.iso.datetime({
      local: true,
      error: "Enter an end date and time.",
    }),
    status: z.enum(["DRAFT", "CONFIRMED"], { error: "Select a status." }),
    items: z
      .array(reservationItemSchema)
      .min(1, "Add at least one equipment item."),
  })
  .superRefine((input, ctx) => {
    if (toUtcDate(input.endAt) <= toUtcDate(input.startAt)) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End time must be after start time.",
      });
    }

    const seen = new Set<string>();
    input.items.forEach((item, index) => {
      if (item.equipmentId && seen.has(item.equipmentId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "equipmentId"],
          message: "This equipment is already in the reservation.",
        });
      }
      seen.add(item.equipmentId);
    });
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
