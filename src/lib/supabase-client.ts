import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Не бросаем исключение — просто вход по email не будет работать, пока
  // не заданы переменные окружения. Остальное приложение (Telegram-логин
  // и т.д.) от этого не зависит.
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY не заданы — вход по email недоступен"
  );
}

// anon/publishable-ключ безопасно использовать на клиенте — он для этого и
// выдаётся Supabase (в отличие от service_role-ключа, который должен жить
// только на бэкенде).
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
