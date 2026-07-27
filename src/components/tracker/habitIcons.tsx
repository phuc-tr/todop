import {
  BookOpen, Code2, Dumbbell, Footprints, PenLine, Music, Palette,
  GraduationCap, Brain, Coffee, Bike, Timer, Languages, Camera,
  Gamepad2, Guitar, HeartPulse, Leaf, Moon, Sun, Utensils, Droplet,
  Flame, Trophy, Target, Zap, Sparkles, Star, Book, Laptop,
  type LucideIcon,
} from "lucide-react";

export const HABIT_ICONS: Record<string, LucideIcon> = {
  book: Book,
  bookOpen: BookOpen,
  code: Code2,
  laptop: Laptop,
  dumbbell: Dumbbell,
  footprints: Footprints,
  bike: Bike,
  pen: PenLine,
  music: Music,
  guitar: Guitar,
  palette: Palette,
  camera: Camera,
  gamepad: Gamepad2,
  brain: Brain,
  grad: GraduationCap,
  languages: Languages,
  coffee: Coffee,
  utensils: Utensils,
  water: Droplet,
  heart: HeartPulse,
  leaf: Leaf,
  moon: Moon,
  sun: Sun,
  timer: Timer,
  flame: Flame,
  trophy: Trophy,
  target: Target,
  zap: Zap,
  sparkles: Sparkles,
  star: Star,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICONS);

export function HabitIcon({
  name,
  className,
  size,
}: {
  name?: string | null;
  className?: string;
  size?: number;
}) {
  if (!name) return null;
  const Icon = HABIT_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} size={size} />;
}