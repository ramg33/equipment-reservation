import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { ReservationForm } from "@/features/reservations/reservation-form";
import { listLocations } from "@/server/locations/list-locations";
import { getReservationFormValues } from "@/server/reservations/get-reservation";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locations, reservation] = await Promise.all([
    listLocations(),
    getReservationFormValues(id),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          Edit Reservation
        </Typography>
        <Typography color="text.secondary">
          Times are entered and shown in UTC. This reservation&apos;s current quantities don&apos;t count
          against availability while you edit it.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <ReservationForm locations={locations} reservationId={id} defaultValues={reservation} />
        </CardContent>
      </Card>
    </Stack>
  );
}
