import { Manrope, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// ⚠️ DESIGN.md от Stitch предписывал Plus Jakarta Sans, но у него нет подсета
// "cyrillic" (только "cyrillic-ext" — доп. символы вроде укр. "і", НЕ базовые
// русские буквы). Для русскоязычного текста он тихо падал бы на системный
// шрифт. Manrope визуально в той же геометрично-гуманистической категории
// (их часто сравнивают как взаимозаменяемые) и имеет полную поддержку
// кириллицы — использую его вместо предписанного шрифта.
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta", // имя переменной оставлено как в токене globals.css
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${manrope.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
