import { useEffect, useState } from "react";

export type DayBackground = {
  id: string;
  label: string;
  src: string;
  /** `background-position` for the header strip; defaults to "center". */
  position?: string;
};
export type BackgroundSet = {
  id: string;
  label: string;
  items: DayBackground[];
  /** Applied to every tile in the set unless the tile sets its own. */
  position?: string;
};

/** Tiles cropped from the background sheets, in sheet order (left→right, top→bottom). */
export const BACKGROUND_SETS: BackgroundSet[] = [
  {
    id: "textures",
    label: "Textures",
    items: [
      { id: "01", label: "Botanical", src: "/day-bg/01.webp" },
      { id: "02", label: "Clouds", src: "/day-bg/02.webp" },
      { id: "03", label: "Airmail", src: "/day-bg/03.webp" },
      { id: "04", label: "Night sky", src: "/day-bg/04.webp" },
      { id: "05", label: "Hearts", src: "/day-bg/05.webp" },
      { id: "06", label: "Sunburst", src: "/day-bg/06.webp" },
      { id: "07", label: "Waves", src: "/day-bg/07.webp" },
      { id: "08", label: "Ink splatter", src: "/day-bg/08.webp" },
      { id: "09", label: "Chalkboard", src: "/day-bg/09.webp" },
      { id: "10", label: "Grid paper", src: "/day-bg/10.webp" },
      { id: "11", label: "Blobs", src: "/day-bg/11.webp" },
      { id: "12", label: "Mountains", src: "/day-bg/12.webp" },
      { id: "13", label: "Lanterns", src: "/day-bg/13.webp" },
      { id: "14", label: "Painted sky", src: "/day-bg/14.webp" },
      { id: "15", label: "Coffee", src: "/day-bg/15.webp" },
      { id: "16", label: "Neon arcade", src: "/day-bg/16.webp" },
    ],
  },
  {
    id: "doodles",
    label: "Doodles",
    // The drawn objects sit along the bottom edge, so a short header strip has
    // to crop there or it shows nothing but flat colour.
    position: "center bottom",
    items: [
      { id: "d01", label: "Stationery", src: "/day-bg/d01.webp" },
      { id: "d02", label: "Headphones", src: "/day-bg/d02.webp" },
      { id: "d03", label: "Camera", src: "/day-bg/d03.webp" },
      { id: "d04", label: "Night reading", src: "/day-bg/d04.webp" },
      { id: "d05", label: "Sweets", src: "/day-bg/d05.webp" },
      { id: "d06", label: "Skateboard", src: "/day-bg/d06.webp" },
      { id: "d07", label: "Cactus", src: "/day-bg/d07.webp" },
      { id: "d08", label: "Coffee run", src: "/day-bg/d08.webp" },
      { id: "d09", label: "Space", src: "/day-bg/d09.webp" },
      { id: "d10", label: "Notebook page", src: "/day-bg/d10.webp" },
      { id: "d11", label: "Pizza", src: "/day-bg/d11.webp" },
      { id: "d12", label: "Gaming", src: "/day-bg/d12.webp" },
      { id: "d13", label: "Cat", src: "/day-bg/d13.webp" },
      { id: "d14", label: "Planner", src: "/day-bg/d14.webp" },
      { id: "d15", label: "Baking", src: "/day-bg/d15.webp" },
      { id: "d16", label: "Instant photo", src: "/day-bg/d16.webp" },
    ],
  },
];

export const DAY_BACKGROUNDS: DayBackground[] = BACKGROUND_SETS.flatMap((s) =>
  s.items.map((item) => ({ position: s.position, ...item })),
);

export function getDayBackground(id: string | undefined): DayBackground | null {
  if (!id) return null;
  return DAY_BACKGROUNDS.find((b) => b.id === id) ?? null;
}

/** Keyed by `Date.getDay()` — 0 = Sunday … 6 = Saturday. */
export type DayBackgroundMap = Record<number, string>;

/** Weekday indices in display order (Monday first), matching DAY_LABELS. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const STORAGE_KEY = "tracker.dayBackgrounds";
const CHANGE_EVENT = "tracker:day-backgrounds-changed";

export function loadDayBackgrounds(): DayBackgroundMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: DayBackgroundMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const weekday = Number(key);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
      if (typeof value === "string" && getDayBackground(value)) out[weekday] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function save(map: DayBackgroundMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent<DayBackgroundMap>(CHANGE_EVENT, { detail: map }));
}

export function setDayBackground(weekday: number, id: string | null) {
  const next = { ...loadDayBackgrounds() };
  if (id) next[weekday] = id;
  else delete next[weekday];
  save(next);
}

export function clearDayBackgrounds() {
  save({});
}

/** Reads the stored map and stays in sync with changes made anywhere in the app. */
export function useDayBackgrounds(): DayBackgroundMap {
  const [map, setMap] = useState<DayBackgroundMap>({});
  useEffect(() => {
    setMap(loadDayBackgrounds());
    const onChange = (e: Event) => setMap((e as CustomEvent<DayBackgroundMap>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMap(loadDayBackgrounds());
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return map;
}
