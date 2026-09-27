import { prisma } from "@/lib/prisma";
import type { LocationOption } from "@/types/location";

export async function listLocations(): Promise<LocationOption[]> {
  return prisma.location.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      equipment: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, totalQuantity: true },
      },
    },
  });
}
