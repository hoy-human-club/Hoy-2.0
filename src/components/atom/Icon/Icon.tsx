import type { CSSProperties, ReactNode } from 'react';
import {
  Activity, AppWindow, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpDown, AtSign, Banknote, Bell,
  BellRing, BookOpen, BookOpenCheck, Building2, Cake, Calendar, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus,
  Camera, ChartColumn, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CircleAlert, CircleArrowUp, CircleCheck,
  CircleEllipsis, CircleHelp, CircleUser, CircleX, ClipboardCheck, Clock, Code, Coins, Component, Contact, CreditCard,
  DoorOpen, Download, Ellipsis, FileLock, FingerprintPattern, FileText, Flag, Flame, Frame, Funnel, Gauge, Gift, Globe, HandCoins, HeartPulse,
  History, House, IdCard, Image, Inbox, Info, Landmark, Languages, Layers, LayoutDashboard, LayoutGrid, Library, Link,
  ListChecks, ListOrdered, ListPlus, LogOut, Mail, MailPlus, MapPin, MessageCircle, MessageSquareText, MessagesSquare,
  Monitor, MonitorSmartphone, Moon, MoonStar, NotebookPen, Palette, PanelsTopLeft, Pause, Percent, Phone, Play, Plug, Plus,
  QrCode, Receipt, ReceiptText, Scale, ScrollText, Search, Send, Settings, Share2, ShieldCheck, ShoppingBag,
  SlidersHorizontal, Smartphone, Sparkles, SquarePen, Star, Sun, Table, Tablet, Ticket, ToggleRight, Trash2, TriangleAlert,
  Tv, Undo2, User, UserCheck, UserCog, UserPlus, UserX, Users, Wallet, X, BookA, Siren, Mic, Database, KeyRound, LayoutTemplate,
  GraduationCap, Files, Copy, Eye, EyeOff, RefreshCw, Store, Kanban, List, LayoutList, Waypoints, ChartGantt, Pin, PinOff,
  PanelLeftClose, PanelLeftOpen, Columns3, Group, ZoomIn, ZoomOut, Locate, GripVertical, Braces, CalendarRange, type LucideIcon,
} from 'lucide-react';
import type { IconSize } from '../../../design/tokens';
import './Icon.css';

/**
 * The product icon set (0030): lucide glyphs behind one seam. Every call site says `<Icon name="…" />` or passes the
 * name as a string to an `icon` slot (Button, ListRow, EmptyState, Notice, Card, NavBar); nothing imports lucide
 * directly, so swapping or redrawing a glyph is one line here. Named imports only, so Vite ships just these glyphs.
 */
const ICONS = {
  // navigation · customer, teacher, staff, admin, dev
  home: House, schedule: CalendarDays, history: History, more: CircleEllipsis, profile: CircleUser, classes: CalendarCheck,
  payroll: Banknote, inbox: Inbox, checkin: ClipboardCheck, register: HandCoins, rooms: DoorOpen, dashboard: LayoutDashboard,
  content: SquarePen, table: Table, mail: Mail, whatsapp: MessageCircle, crm: Contact, deletions: UserX, activity: Activity,
  settings: Settings, integrations: Plug, finance: ChartColumn, expenses: ReceiptText, tokens: Palette, components: Component,
  specs: FileText, layout: PanelsTopLeft, knowledgebase: Library, canvas: Frame, simulator: MonitorSmartphone, manual: BookOpen,
  docs: BookOpenCheck,
  // actions · front desk, admin, customer
  plus: Plus, 'user-plus': UserPlus, invite: MailPlus, send: Send, 'user-check': UserCheck, cancel: CircleX, move: ArrowLeftRight,
  'user-x': UserX, sell: ShoppingBag, payment: CreditCard, promote: CircleArrowUp, notes: NotebookPen, search: Search, filter: Funnel,
  download: Download, 'calendar-plus': CalendarPlus, share: Share2, link: Link, 'log-out': LogOut, trash: Trash2, close: X,
  pause: Pause, undo: Undo2, edit: SquarePen, play: Play, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft,
  'arrow-up': ArrowUp, 'arrow-down': ArrowDown, sort: ArrowUpDown, 'chevron-right': ChevronRight, 'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown, 'chevron-up': ChevronUp, 'list-plus': ListPlus, waitlist: ListOrdered, qr: QrCode,
  // 0041: copy a value, reveal / hide a secret, rotate a key
  copy: Copy, eye: Eye, 'eye-off': EyeOff, 'refresh-cw': RefreshCw,
  // settings groups and sections (M-08)
  studio: Building2, identity: IdCard, clock: Clock, capacity: Users, policies: ScrollText, features: ToggleRight, flag: Flag,
  'credit-card': CreditCard, fiscal: Landmark, tax: Percent, communications: MessagesSquare, 'quiet-hours': MoonStar,
  branding: Palette, legal: Scale, 'map-pin': MapPin, image: Image, sliders: SlidersHorizontal,
  // 0041: Google Business Profile (the studio's storefront listing)
  store: Store,
  // things and status
  calendar: Calendar, 'calendar-clock': CalendarClock, bell: Bell, 'bell-ring': BellRing, shield: ShieldCheck, languages: Languages,
  help: CircleHelp, user: User, 'user-cog': UserCog, users: Users, coins: Coins, ticket: Ticket, gift: Gift, star: Star,
  'at-sign': AtSign, message: MessageSquareText, phone: Phone, wallet: Wallet, bank: Landmark, cash: Banknote, flame: Flame,
  health: HeartPulse, info: Info, 'circle-check': CircleCheck, 'circle-alert': CircleAlert, alert: TriangleAlert, check: Check,
  cake: Cake, 'file-lock': FileLock, biometric: FingerprintPattern, receipt: Receipt, ellipsis: Ellipsis,
  // hub, canvas and simulator (the 0029 set, now drawn by lucide)
  globe: Globe, sun: Sun, moon: Moon, sparkle: Sparkles, book: BookOpen, 'file-text': FileText, layers: Layers, code: Code,
  grid: LayoutGrid, gauge: Gauge, camera: Camera, monitor: Monitor, smartphone: Smartphone, tv: Tv, tablet: Tablet,
  window: AppWindow, palette: Palette, 'list-checks': ListChecks,
  // operations manual (0031): the chapter / part icons and the LMS tiles that the set above did not cover
  'book-a': BookA, siren: Siren, mic: Mic, database: Database, 'key-round': KeyRound, 'layout-template': LayoutTemplate,
  'graduation-cap': GraduationCap, files: Files,
  // 0044: the table manager (M-03) — view kinds, the sidebar states, pin, the toolbar and the graph controls
  kanban: Kanban, list: List, 'layout-list': LayoutList, graph: Waypoints, gantt: ChartGantt, pin: Pin, 'pin-off': PinOff,
  'panel-left-close': PanelLeftClose, 'panel-left-open': PanelLeftOpen, columns: Columns3, group: Group, 'zoom-in': ZoomIn,
  'zoom-out': ZoomOut, locate: Locate, grip: GripVertical, braces: Braces,
  // 0046: the M-03 calendar modes (month · week · agenda) and the timeline
  'calendar-days': CalendarDays, 'calendar-range': CalendarRange,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
/** The groups D-02 renders, in the order above. */
export const ICON_GROUPS: { key: 'nav' | 'action' | 'settings' | 'thing' | 'tool'; names: IconName[] }[] = (() => {
  const cuts: [typeof ICON_GROUPS[number]['key'], IconName][] = [['nav', 'home'], ['action', 'plus'], ['settings', 'studio'], ['thing', 'calendar'], ['tool', 'globe']];
  return cuts.map(([key, first], i) => {
    const from = ICON_NAMES.indexOf(first);
    const to = i + 1 < cuts.length ? ICON_NAMES.indexOf(cuts[i + 1][1]) : ICON_NAMES.length;
    return { key, names: ICON_NAMES.slice(from, to) };
  });
})();

export const isIconName = (v: unknown): v is IconName => typeof v === 'string' && Object.prototype.hasOwnProperty.call(ICONS, v);

export interface IconProps {
  name: IconName;
  /** A D-01 step (`xs` 14 · `sm` 16 · `md` 20 · `lg` 24 · `xl` 32, rem so it grows with `--ui`) or a px number. 44 px targets come from the control around it. */
  size?: IconSize | number;
  /** Overrides the `--icon-stroke` token (1.75). The active nav item uses `--icon-stroke-active` through CSS. */
  strokeWidth?: number;
  className?: string;
  /** Set it only when the icon carries meaning on its own; otherwise it is aria-hidden. */
  title?: string;
}

export function Icon({ name, size = 'md', strokeWidth, className = '', title }: IconProps) {
  const Glyph = ICONS[name] ?? ICONS.help;
  const dim = typeof size === 'number' ? `${size}px` : `var(--icon-${size})`;
  const style: CSSProperties = { width: dim, height: dim, ...(strokeWidth ? { strokeWidth } : null) };
  return (
    <Glyph
      className={`icon ${className}`} style={style} aria-hidden={title ? undefined : true} focusable="false"
      role={title ? 'img' : undefined} aria-label={title} data-icon={name}
    />
  );
}

/**
 * The `icon` slot helper for molecules: a known icon name renders the glyph; anything else (an Avatar, a custom node, a
 * seeded article glyph) renders as given. Keeps call sites short (`icon="calendar"`) without closing the slot.
 */
export function renderIcon(icon: ReactNode, size: IconSize | number = 'md'): ReactNode {
  if (isIconName(icon)) return <Icon name={icon} size={size} />;
  // A kebab-case word that is not in the set is almost always a typo that would render as text: say so in dev.
  if (import.meta.env.DEV && typeof icon === 'string' && /^[a-z][a-z0-9]*(-[a-z0-9]+)+$|^[a-z]{3,}$/.test(icon)) console.warn(`[Icon] unknown icon name "${icon}" (renders as text)`);
  return icon;
}
