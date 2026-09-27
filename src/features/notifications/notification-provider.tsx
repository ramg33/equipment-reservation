"use client";

import { Alert, Snackbar } from "@mui/material";
import { createContext, useContext, useState, type ReactNode } from "react";

type Notify = (message: string) => void;

const NotificationContext = createContext<Notify | null>(null);

// Lives in the root layout so a message survives client-side navigation (e.g. form → list).
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  function handleClose(_event?: unknown, reason?: string) {
    if (reason === "clickaway") return;
    setMessage(null);
  }

  return (
    <NotificationContext.Provider value={setMessage}>
      {children}
      <Snackbar
        open={message !== null}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={handleClose} sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify(): Notify {
  const notify = useContext(NotificationContext);
  if (!notify) {
    throw new Error("useNotify must be used within NotificationProvider.");
  }
  return notify;
}
