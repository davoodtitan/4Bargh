// functions/api/history.js
// Cloudflare Pages Function - به‌صورت خودکار توسط Cloudflare اجرا می‌شه

const KV_KEY = 'games';

async function getGames(env) {
  const raw = await env.HISTORY_KV.get(KV_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function saveGames(env, games) {
  await env.HISTORY_KV.put(KV_KEY, JSON.stringify(games));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// GET /api/history — همه می‌تونن تاریخچه رو ببینن
export async function onRequestGet({ env }) {
  return json(await getGames(env));
}

// POST /api/history — ثبت نتیجه بازی جدید
export async function onRequestPost({ request, env }) {
  let game;
  try { game = await request.json(); }
  catch (e) { return json({ error: 'JSON نامعتبر' }, 400); }
  if (!game || !Array.isArray(game.teams) || !Array.isArray(game.scores))
    return json({ error: 'ساختار بازی نامعتبره' }, 400);
  const games = await getGames(env);
  games.push(game);
  await saveGames(env, games);
  return json(games);
}

// DELETE /api/history?index=N — فقط با رمز ادمین درست
export async function onRequestDelete({ request, env }) {
  const providedKey = request.headers.get('x-admin-key') || '';
  const realKey = env.ADMIN_KEY || '';
  if (!realKey || providedKey !== realKey)
    return json({ error: 'رمز ادمین اشتباهه' }, 403);
  const url = new URL(request.url);
  const index = parseInt(url.searchParams.get('index'), 10);
  const games = await getGames(env);
  if (Number.isNaN(index) || index < 0 || index >= games.length)
    return json({ error: 'ایندکس نامعتبره' }, 400);
  games.splice(index, 1);
  await saveGames(env, games);
  return json(games);
}
