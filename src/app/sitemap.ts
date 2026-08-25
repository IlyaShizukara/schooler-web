import type { MetadataRoute } from "next";

// ⚠️ Пока в карте только "/" — все остальные роуты требуют входа через
// Telegram (см. GuestPrompt), поисковик там либо ничего не увидит, либо
// увидит "тонкий" контент без ценности. Добавлять сюда /subjects,
// /probnik и т.п. смысла нет, пока они не отдают гостю что-то реальное
// без авторизации.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://myschooler.ru",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
