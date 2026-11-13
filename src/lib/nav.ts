import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Home,
  Images,
  ListOrdered,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/** PRD §4: Home · Timeline · Photos · Foundation · Calendar · More */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/admin", icon: Home },
  { label: "Timeline", href: "/admin/timeline", icon: ListOrdered },
  { label: "Photos", href: "/admin/photos", icon: Images },
  { label: "Foundation", href: "/admin/foundation", icon: GraduationCap },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
];

/** PRD §4 More menu: Bookshelf, Drafts, About Us editor, Settings */
export const MORE_NAV: NavItem[] = [
  { label: "Bookshelf", href: "/admin/bookshelf", icon: BookOpen },
  { label: "Drafts", href: "/admin/drafts", icon: FileText },
  { label: "About Us editor", href: "/admin/about", icon: NotebookPen },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/** Phone tab bar: Home, Timeline, +, Photos, More. "More" on phones also holds Foundation and Calendar. */
export const TAB_NAV: NavItem[] = [PRIMARY_NAV[0]!, PRIMARY_NAV[1]!, PRIMARY_NAV[2]!];
export const TAB_MORE_NAV: NavItem[] = [PRIMARY_NAV[3]!, PRIMARY_NAV[4]!, ...MORE_NAV];

export const NEW_ENTRY_HREF = "/admin/entries/new";

export const PUBLIC_NAV = [
  { label: "Our story", href: "/" },
  { label: "Journal", href: "/journal" },
  { label: "Gallery", href: "/gallery" },
  { label: "Foundation", href: "/foundation" },
] as const;

/** Home and the public root match exactly; every other link also matches its sub-pages. */
export function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (href === "/admin" || href === "/") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

/** The quick-write button is pointless on the entry form itself. */
export function isEntryFormPath(pathname: string): boolean {
  return /^\/admin\/entries\/(new|[^/]+\/edit)\/?$/.test(pathname);
}
