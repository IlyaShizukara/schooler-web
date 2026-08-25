import type { Metadata } from "next";
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

// Базовые метаданные "по умолчанию" для всего сайта — сработают на любой
// странице, где явно не переопределены (через export const metadata или
// generateMetadata в конкретном layout.tsx/page.tsx этого сегмента).
// ⚠️ og-image.png нужно реально положить в /public — сейчас такого файла
// нет, а без него превью ссылки в Telegram/VK/соцсетях будет пустым.
export const metadata: Metadata = {
  metadataBase: new URL("https://myschooler.ru"),
  title: {
    default: "Schooler — подготовка к ЕГЭ и ОГЭ",
    template: "%s · Schooler",
  },
  description:
    "Schooler — сервис подготовки к ЕГЭ и ОГЭ: банк заданий по темам, пробные экзамены с разбором, отслеживание прогресса и слабых мест.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Schooler",
    title: "Schooler — подготовка к ЕГЭ и ОГЭ",
    description:
      "Банк заданий по темам, пробные экзамены с разбором и отслеживание прогресса — всё для подготовки к ЕГЭ и ОГЭ.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schooler — подготовка к ЕГЭ и ОГЭ",
    description: "Банк заданий, пробные экзамены и отслеживание прогресса для подготовки к ЕГЭ и ОГЭ.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
