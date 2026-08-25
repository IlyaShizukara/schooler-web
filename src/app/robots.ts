import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Все /api/* — не для индексации в принципе (это не HTML-страницы, а
      // JSON-эндпоинты бэкенда), запрещаем явно, чтобы не тратить краулинг-
      // бюджет и не путать поисковик.
      disallow: "/api/",
    },
    sitemap: "https://myschooler.ru/sitemap.xml",
  };
}
