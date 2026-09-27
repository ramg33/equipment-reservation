"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  createReservationSchema,
  type CreateReservationInput,
} from "@/schemas/create-reservation";
import { useNotify } from "@/features/notifications/notification-provider";
import type { LocationOption } from "@/types/location";

interface ApiErrorBody {
  error?: string;
}

const emptyItem = { equipmentId: "", quantity: 1 };

export function CreateReservationForm({
  locations,
}: {
  locations: LocationOption[];
}) {
  const router = useRouter();
  const notify = useNotify();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      locationId: "",
      startAt: "",
      endAt: "",
      status: "CONFIRMED",
      items: [emptyItem],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });
  const locationId = useWatch({ control, name: "locationId" });
  const items = useWatch({ control, name: "items" });

  const locationEquipment =
    locations.find((location) => location.id === locationId)?.equipment ?? [];
  const itemsError = errors.items?.message ?? errors.items?.root?.message;

  async function onSubmit(input: CreateReservationInput) {
    setServerError(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json()) as ApiErrorBody;

      if (!response.ok) {
        setServerError(body.error ?? "The reservation could not be created.");
        return;
      }

      notify("Reservation created.");
      router.push("/");
      router.refresh();
    } catch {
      setServerError("The server could not be reached. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={3} sx={{ pt: 1 }}>
        {serverError ? <Alert severity="error">{serverError}</Alert> : null}

        <Controller
          control={control}
          name="locationId"
          render={({ field }) => (
            <TextField
              {...field}
              onChange={(event) => {
                field.onChange(event);
                replace([emptyItem]);
              }}
              select
              label="Location"
              required
              fullWidth
              disabled={isSubmitting}
              error={Boolean(errors.locationId)}
              helperText={errors.locationId?.message}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <TextField
            {...register("startAt")}
            type="datetime-local"
            label="Start (UTC)"
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.startAt)}
            helperText={errors.startAt?.message}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            {...register("endAt")}
            type="datetime-local"
            label="End (UTC)"
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.endAt)}
            helperText={errors.endAt?.message}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        <Stack
          spacing={1.5}
          component="fieldset"
          sx={{ border: 0, p: 0, m: 0 }}
        >
          <Typography
            component="legend"
            variant="subtitle1"
            sx={{ fontWeight: 600 }}
          >
            Equipment
          </Typography>
          {!locationId ? (
            <Typography color="text.secondary" variant="body2">
              Select a location to choose equipment.
            </Typography>
          ) : null}

          {fields.map((field, index) => {
            const selectedElsewhere = new Set(
              items
                .filter((_, itemIndex) => itemIndex !== index)
                .map((item) => item.equipmentId),
            );
            const itemErrors = errors.items?.[index];

            return (
              <Box
                key={field.id}
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: { xs: "stretch", sm: "flex-start" },
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Controller
                  control={control}
                  name={`items.${index}.equipmentId`}
                  render={({ field: equipmentField }) => (
                    <TextField
                      {...equipmentField}
                      select
                      label={`Equipment ${index + 1}`}
                      required
                      fullWidth
                      disabled={isSubmitting || !locationId}
                      error={Boolean(itemErrors?.equipmentId)}
                      helperText={itemErrors?.equipmentId?.message}
                    >
                      {locationEquipment.map((equipment) => (
                        <MenuItem
                          key={equipment.id}
                          value={equipment.id}
                          disabled={selectedElsewhere.has(equipment.id)}
                        >
                          {equipment.name} ({equipment.totalQuantity} total)
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  {...register(`items.${index}.quantity`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  label="Quantity"
                  required
                  disabled={isSubmitting}
                  error={Boolean(itemErrors?.quantity)}
                  helperText={itemErrors?.quantity?.message}
                  sx={{ width: { xs: "100%", sm: 160 }, flexShrink: 0 }}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                />
                <IconButton
                  aria-label={`Remove equipment ${index + 1}`}
                  onClick={() => remove(index)}
                  disabled={isSubmitting || fields.length === 1}
                  sx={{
                    alignSelf: { xs: "flex-end", sm: "flex-start" },
                    mt: { sm: 1 },
                  }}
                >
                  <DeleteOutlinedIcon />
                </IconButton>
              </Box>
            );
          })}

          {itemsError ? (
            <FormHelperText error>{itemsError}</FormHelperText>
          ) : null}

          <Box>
            <Button
              startIcon={<AddIcon />}
              onClick={() => append(emptyItem)}
              disabled={
                isSubmitting ||
                !locationId ||
                fields.length >= locationEquipment.length
              }
            >
              Add equipment
            </Button>
          </Box>
        </Stack>

        <FormControl disabled={isSubmitting} error={Boolean(errors.status)}>
          <FormLabel id="reservation-status-label">Status</FormLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <RadioGroup {...field} aria-labelledby="reservation-status-label">
                <FormControlLabel
                  value="CONFIRMED"
                  control={<Radio />}
                  label="Confirmed — reserves inventory now"
                />
                <FormControlLabel
                  value="DRAFT"
                  control={<Radio />}
                  label="Draft — does not reserve inventory"
                />
              </RadioGroup>
            )}
          />
          {errors.status ? (
            <FormHelperText>{errors.status.message}</FormHelperText>
          ) : null}
        </FormControl>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <Button href="/" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create reservation"}
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
