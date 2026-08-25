import {
  BookOpen,
  Calculator,
  Code2,
  FlaskConical,
  Globe,
  HelpCircle,
  Landmark,
  Languages,
  Leaf,
  Map,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  calculate: Calculator,
  book: BookOpen,
  bolt: Zap,
  science: FlaskConical,
  leaf: Leaf,
  bank: Landmark,
  public: Globe,
  code: Code2,
  translate: Languages,
  map: Map,
};

export function getSubjectIcon(key?: string | null): LucideIcon {
  return ICON_MAP[key ?? ""] ?? HelpCircle;
}