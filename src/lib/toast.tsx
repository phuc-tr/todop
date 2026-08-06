import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

type Severity = "success" | "error" | "info";
type Toast = { key: number; message: string; severity: Severity };

const listeners = new Set<(t: Toast) => void>();
let nextKey = 0;

function emit(severity: Severity, message: string) {
  const item = { key: nextKey++, message, severity };
  listeners.forEach((l) => l(item));
}

/** Drop-in for the previous sonner API, backed by a Material UI Snackbar. */
export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  info: (message: string) => emit("info", message),
};

/**
 * Renders one snackbar at a time. A new toast while another is showing closes
 * the current one first, so the enter/exit transitions never overlap.
 */
export function ToastHost() {
  const [queue, setQueue] = useState<Toast[]>([]);
  const [current, setCurrent] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener = (t: Toast) => setQueue((q) => [...q, t]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    if (!current) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
      setOpen(true);
    } else if (open) {
      setOpen(false);
    }
  }, [queue, current, open]);

  return (
    <Snackbar
      key={current?.key}
      open={open}
      autoHideDuration={4000}
      onClose={(_, reason) => {
        if (reason !== "clickaway") setOpen(false);
      }}
      slotProps={{ transition: { onExited: () => setCurrent(null) } }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={current?.severity ?? "info"}
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{ width: "100%", borderRadius: 2 }}
      >
        {current?.message}
      </Alert>
    </Snackbar>
  );
}
