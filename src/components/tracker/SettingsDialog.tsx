import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import { HABIT_ICON_KEYS, HABIT_ICONS, HabitIcon } from "./habitIcons";
import { getSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { ChangePassword } from "./ChangePassword";
import { DAY_LABELS } from "@/lib/week";
import {
  BACKGROUND_SETS,
  WEEKDAY_ORDER,
  clearDayBackgrounds,
  getDayBackground,
  setDayBackground,
  useDayBackgrounds,
} from "@/lib/dayBackgrounds";

export type Habit = {
  id: string;
  name: string;
  weekly_goal: number;
  unit: string;
  icon: string;
};

/** Section heading + optional description, shared by every settings block. */
function SettingRow({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">{title}</Typography>
          {description && (
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
    </Box>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Current = value ? HABIT_ICONS[value] : null;

  function pick(key: string) {
    onChange(key);
    setAnchor(null);
  }

  return (
    <>
      <Tooltip title="Choose icon">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Choose icon"
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            width: 40,
            height: 40,
            flexShrink: 0,
            color: value ? "primary.main" : "text.disabled",
          }}
        >
          {Current ? <Current fontSize="small" /> : <SentimentSatisfiedAltIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box
          sx={{
            p: 1,
            width: 264,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 0.5,
          }}
        >
          <ButtonBase
            onClick={() => pick("")}
            aria-label="No icon"
            sx={{
              height: 36,
              borderRadius: 1.5,
              fontSize: 11,
              color: "text.secondary",
              bgcolor: !value ? "action.selected" : undefined,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            None
          </ButtonBase>
          {HABIT_ICON_KEYS.map((key) => {
            const Icon = HABIT_ICONS[key];
            const selected = value === key;
            return (
              <ButtonBase
                key={key}
                onClick={() => pick(key)}
                aria-label={key}
                title={key}
                sx={{
                  height: 36,
                  borderRadius: 1.5,
                  color: selected ? "primary.main" : "text.secondary",
                  bgcolor: selected ? "action.selected" : undefined,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Icon fontSize="small" />
              </ButtonBase>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

function DayBackgroundPicker() {
  const map = useDayBackgrounds();
  const anySet = WEEKDAY_ORDER.some((d) => map[d]);
  // The grid stays inline rather than living in a popover: a popover portals
  // outside the dialog, where the dialog's scroll lock eats its wheel events.
  const [openDay, setOpenDay] = useState<number | null>(null);
  const openSelected = openDay === null ? null : getDayBackground(map[openDay]);

  return (
    <SettingRow
      title="Day backgrounds"
      description="An image behind each weekday's header."
      action={
        anySet ? (
          <Button size="small" color="inherit" onClick={clearDayBackgrounds}>
            Reset
          </Button>
        ) : undefined
      }
    >
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {WEEKDAY_ORDER.map((weekday, i) => {
          const selected = getDayBackground(map[weekday]);
          const isOpen = openDay === weekday;
          return (
            <ButtonBase
              key={weekday}
              onClick={() => setOpenDay(isOpen ? null : weekday)}
              aria-expanded={isOpen}
              aria-label={`Background for ${DAY_LABELS[i]}`}
              sx={{ flexDirection: "column", gap: 0.5, borderRadius: 2, p: 0.5 }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  border: 2,
                  borderColor: isOpen ? "primary.main" : "divider",
                  bgcolor: selected ? undefined : "action.hover",
                  backgroundImage: selected ? `url(${selected.src})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 9,
                  color: "text.disabled",
                }}
              >
                {!selected && "None"}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {DAY_LABELS[i]}
              </Typography>
            </ButtonBase>
          );
        })}
      </Stack>

      <Collapse in={openDay !== null} unmountOnExit>
        {openDay !== null && (
          <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}
            >
              <Typography variant="subtitle2">
                {DAY_LABELS[WEEKDAY_ORDER.indexOf(openDay)]}
              </Typography>
              <Button
                size="small"
                variant={openSelected ? "text" : "outlined"}
                color="inherit"
                onClick={() => setDayBackground(openDay, null)}
              >
                None
              </Button>
            </Stack>
            {BACKGROUND_SETS.map((set) => (
              <Box key={set.id} sx={{ "&:not(:last-of-type)": { mb: 1.5 } }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.8 }}
                >
                  {set.label}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 0.75,
                  }}
                >
                  {set.items.map((bg) => (
                    <ButtonBase
                      key={bg.id}
                      onClick={() => setDayBackground(openDay, bg.id)}
                      title={bg.label}
                      aria-label={bg.label}
                      sx={{
                        aspectRatio: "1 / 1",
                        borderRadius: 1.5,
                        border: 2,
                        borderColor: openSelected?.id === bg.id ? "primary.main" : "divider",
                        backgroundImage: `url(${bg.src})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        transition: "opacity .15s",
                        "&:hover": { opacity: 0.82 },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Collapse>
    </SettingRow>
  );
}

export function SettingsDialog({
  habits,
  tasksGoal,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  onSetTasksGoal,
}: {
  habits: Habit[];
  tasksGoal: number;
  onCreateHabit: (input: { name: string; weekly_goal: number; unit: string; icon: string }) => void;
  onUpdateHabit: (id: string, patch: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
  onSetTasksGoal: (goal: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [unit, setUnit] = useState("");
  const [icon, setIcon] = useState("");
  const [sound, setSound] = useState<boolean>(() => getSoundEnabled());

  useEffect(() => {
    const handler = (e: Event) => setSound((e as CustomEvent<boolean>).detail);
    window.addEventListener("tracker:sound-changed", handler);
    return () => window.removeEventListener("tracker:sound-changed", handler);
  }, []);

  function addHabit() {
    if (!name.trim()) return;
    onCreateHabit({
      name: name.trim(),
      weekly_goal: parseInt(goal) || 0,
      unit: unit.trim(),
      icon,
    });
    setName("");
    setGoal("");
    setUnit("");
    setIcon("");
  }

  return (
    <>
      <Tooltip title="Settings">
        <IconButton onClick={() => setOpen(true)} aria-label="Settings">
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1.5 }}
        >
          Settings
          <IconButton onClick={() => setOpen(false)} aria-label="Close settings" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} divider={<Divider flexItem />}>
            <SettingRow title="Weekly task goal" description="Tasks to complete across the week.">
              <TextField
                type="number"
                value={tasksGoal}
                onChange={(e) => onSetTasksGoal(parseInt(e.target.value) || 0)}
                sx={{ width: 140 }}
              />
            </SettingRow>

            <SettingRow
              title="Sound effects"
              description="Play a chime on completion and delete."
              action={
                <Switch
                  checked={sound}
                  onChange={(e) => {
                    setSound(e.target.checked);
                    setSoundEnabled(e.target.checked);
                  }}
                  slotProps={{ input: { "aria-label": "Toggle sound effects" } }}
                />
              }
            />

            <DayBackgroundPicker />

            <ChangePassword />

            <SettingRow title="Habits" description="Tracked next to each day's tasks.">
              <Stack spacing={1.5}>
                {habits.map((h) => (
                  <Stack key={h.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <IconPicker
                      value={h.icon ?? ""}
                      onChange={(v) => onUpdateHabit(h.id, { icon: v })}
                    />
                    <TextField
                      value={h.name}
                      onChange={(e) => onUpdateHabit(h.id, { name: e.target.value })}
                      placeholder="Name"
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <TextField
                      value={h.unit ?? ""}
                      onChange={(e) => onUpdateHabit(h.id, { unit: e.target.value })}
                      placeholder="Unit"
                      sx={{ width: 80 }}
                    />
                    <TextField
                      type="number"
                      value={h.weekly_goal}
                      onChange={(e) =>
                        onUpdateHabit(h.id, { weekly_goal: parseInt(e.target.value) || 0 })
                      }
                      placeholder="Goal"
                      sx={{ width: 76 }}
                    />
                    <Tooltip title="Delete habit">
                      <IconButton onClick={() => onDeleteHabit(h.id)} aria-label="Delete habit">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
                {habits.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No habits yet.
                  </Typography>
                )}

                <Stack
                  component="form"
                  direction="row"
                  spacing={1}
                  onSubmit={(e: React.FormEvent) => {
                    e.preventDefault();
                    addHabit();
                  }}
                  sx={{ alignItems: "center", pt: 0.5 }}
                >
                  <IconPicker value={icon} onChange={setIcon} />
                  <TextField
                    placeholder="Name (e.g. LeetCode)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <TextField
                    placeholder="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    sx={{ width: 80 }}
                  />
                  <TextField
                    type="number"
                    placeholder="Goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    sx={{ width: 76 }}
                  />
                  <Tooltip title="Add habit">
                    <span>
                      <IconButton
                        type="submit"
                        color="primary"
                        disabled={!name.trim()}
                        aria-label="Add habit"
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </SettingRow>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
