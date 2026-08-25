import { BarChart3, BookOpen, FileText, TrendingUp, User } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Главная", href: "/", icon: BarChart3 },
  { label: "Предметы", href: "/subjects", icon: BookOpen },
  { label: "Пробник", href: "/probnik", icon: FileText },
  { label: "Прогресс", href: "/progress", icon: TrendingUp },
  { label: "Профиль", href: "/profile", icon: User },
] as const;