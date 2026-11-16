// В установленном пакете lucide-react отсутствует .d.ts — объявляем минимально.
declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react';
  export type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }>;
  export const MessageCircle: Icon;
  export const Phone: Icon;
  export const User: Icon;
  export const Settings: Icon;
  export const Search: Icon;
  export const ShieldCheck: Icon;
  export const SlidersHorizontal: Icon;
  export const Wifi: Icon;
  export const WifiOff: Icon;
  export const BadgeCheck: Icon;
  export const ArrowLeft: Icon;
  export const Send: Icon;
  export const MoreVertical: Icon;
  export const Paperclip: Icon;
  export const Settings2: Icon;
  export const ImagePlus: Icon;
  export const Check: Icon;
  export const X: Icon;
  export const Sparkles: Icon;
  export const Palette: Icon;
  export const Type: Icon;
  export const RotateCcw: Icon;
  export const LogOut: Icon;
  export const Github: Icon;
  export const Info: Icon;
  export const Zap: Icon;
}
