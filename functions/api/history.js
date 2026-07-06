// این فایل باید دقیقاً در مسیر  functions/api/history.js  توی ریشه‌ی ریپازیتوری باشه.
// کلادفلر پیجز به‌طور خودکار این فایل رو به آدرس  /api/history  تبدیل می‌کنه.

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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// GET /api/history  -> همه می‌تونن ببینن
export async function onRequestGet(context) {
  const { env } = context;
  const games = await getGames(env);
  return jsonResponse(games);
}

// POST /api/history  -> ثبت نتیجه بازی جدید (همه اجازه دارن، چون خود بازی‌کن‌ها باید بتونن ذخیره کنن)
export async function onRequestPost(context) {
  const { request, env } = context;
  let game;
  try {
    game = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'بدنه‌ی درخواست JSON معتبر نیست' }, 400);
  }
  if (!game || !Array.isArray(game.teams) || !Array.isArray(game.scores)) {
    return jsonResponse({ error: 'ساختار بازی نامعتبره' }, 400);
  }
  const games = await getGames(env);
  games.push(game);
  await saveGames(env, games);
  return jsonResponse(games);
}

// DELETE /api/history?index=N  -> فقط با کلید ادمین درست
export async function onRequestDelete(context) {
  const { request, env } = context;

  const providedKey = request.headers.get('x-admin-key') || '';
  const realKey = env.ADMIN_KEY || '';

  if (!realKey || providedKey !== realKey) {
    return jsonResponse({ error: 'اجازه‌ی حذف نداری (رمز ادمین اشتباهه)' }, 403);
  }

  const url = new URL(request.url);
  const index = parseInt(url.searchParams.get('index'), 10);
  const games = await getGames(env);

  if (Number.isNaN(index) || index < 0 || index >= games.length) {
    return jsonResponse({ error: 'ایندکس نامعتبره' }, 400);
  }

  games.splice(index, 1);
  await saveGames(env, games);
  return jsonResponse(games);
}
