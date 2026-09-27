import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { CreateReservationForm } from "@/features/reservations/create-reservation-form";
import { listLocations } from "@/server/locations/list-locations";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const locations = await listLocations();

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          New Reservation
        </Typography>
        <Typography color="text.secondary">
          Reserve equipment at a location. Times are entered and shown in UTC.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          {locations.length === 0 ? (
            <Alert severity="info">No locations are set up yet, so reservations can&apos;t be created.</Alert>
          ) : (
            <CreateReservationForm locations={locations} />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
