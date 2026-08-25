import { ProbnikRunProvider } from "@/lib/probnik-run-context";

export default function ProbnikLayout({ children }: { children: React.ReactNode }) {
  return <ProbnikRunProvider>{children}</ProbnikRunProvider>;
}