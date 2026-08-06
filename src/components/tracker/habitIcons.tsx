import type { SvgIconProps } from "@mui/material/SvgIcon";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import BookOutlined from "@mui/icons-material/BookOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import DirectionsBikeOutlined from "@mui/icons-material/DirectionsBikeOutlined";
import DirectionsWalkOutlined from "@mui/icons-material/DirectionsWalkOutlined";
import EditNoteOutlined from "@mui/icons-material/EditNoteOutlined";
import EmojiEventsOutlined from "@mui/icons-material/EmojiEventsOutlined";
import FitnessCenterOutlined from "@mui/icons-material/FitnessCenterOutlined";
import LaptopOutlined from "@mui/icons-material/LaptopOutlined";
import LibraryMusicOutlined from "@mui/icons-material/LibraryMusicOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import LocalCafeOutlined from "@mui/icons-material/LocalCafeOutlined";
import LocalFireDepartmentOutlined from "@mui/icons-material/LocalFireDepartmentOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import MonitorHeartOutlined from "@mui/icons-material/MonitorHeartOutlined";
import MusicNoteOutlined from "@mui/icons-material/MusicNoteOutlined";
import PaletteOutlined from "@mui/icons-material/PaletteOutlined";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import RestaurantOutlined from "@mui/icons-material/RestaurantOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import SpaOutlined from "@mui/icons-material/SpaOutlined";
import SportsEsportsOutlined from "@mui/icons-material/SportsEsportsOutlined";
import StarOutlined from "@mui/icons-material/StarOutlined";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import TrackChangesOutlined from "@mui/icons-material/TrackChangesOutlined";
import TranslateOutlined from "@mui/icons-material/TranslateOutlined";
import WaterDropOutlined from "@mui/icons-material/WaterDropOutlined";
import CodeOutlined from "@mui/icons-material/CodeOutlined";

type IconComponent = React.ComponentType<SvgIconProps>;

/** Keys are persisted on habit rows, so they must stay stable. */
export const HABIT_ICONS: Record<string, IconComponent> = {
  book: BookOutlined,
  bookOpen: MenuBookOutlined,
  code: CodeOutlined,
  laptop: LaptopOutlined,
  dumbbell: FitnessCenterOutlined,
  footprints: DirectionsWalkOutlined,
  bike: DirectionsBikeOutlined,
  pen: EditNoteOutlined,
  music: MusicNoteOutlined,
  guitar: LibraryMusicOutlined,
  palette: PaletteOutlined,
  camera: PhotoCameraOutlined,
  gamepad: SportsEsportsOutlined,
  brain: PsychologyOutlined,
  grad: SchoolOutlined,
  languages: TranslateOutlined,
  coffee: LocalCafeOutlined,
  utensils: RestaurantOutlined,
  water: WaterDropOutlined,
  heart: MonitorHeartOutlined,
  leaf: SpaOutlined,
  moon: DarkModeOutlined,
  sun: LightModeOutlined,
  timer: TimerOutlined,
  flame: LocalFireDepartmentOutlined,
  trophy: EmojiEventsOutlined,
  target: TrackChangesOutlined,
  zap: BoltOutlined,
  sparkles: AutoAwesomeOutlined,
  star: StarOutlined,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICONS);

export function HabitIcon({ name, ...props }: { name?: string | null } & SvgIconProps) {
  if (!name) return null;
  const Icon = HABIT_ICONS[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
