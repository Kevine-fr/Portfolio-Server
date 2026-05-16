import {
  LayoutDashboard, FolderKanban, Sparkles, Briefcase,
  GraduationCap, Tags, Inbox, Users, UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/about',       label: 'À propos',        icon: UserCircle },
  { href: '/projects',    label: 'Projets',         icon: FolderKanban },
  { href: '/skills',      label: 'Compétences',     icon: Sparkles },
  { href: '/experiences', label: 'Expériences',     icon: Briefcase },
  { href: '/education',   label: 'Formation',       icon: GraduationCap },
  { href: '/tags',        label: 'Étiquettes',      icon: Tags },
  { href: '/contacts',    label: 'Messages',        icon: Inbox },
  { href: '/users',       label: 'Utilisateurs',    icon: Users, adminOnly: true },
];
