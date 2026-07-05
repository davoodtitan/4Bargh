// Cloudflare Pages Function — shared game history API
// Requires a KV namespace bound to this Pages project as "HISTORY"
// (Settings → Bindings → Add → KV namespace → Variable name: HISTORY)

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

async function readGames(env) {
  const raw = await env.HISTORY.get('games');
  return raw ? JSON.parse(raw) : [];
}

export async function onRequestGet({ env }) {
  const games = await readGames(env);
  return new Response(JSON.stringify(games), { headers: JSON_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const games = await readGames(env);
  games.push(body);
  await env.HISTORY.put('games', JSON.stringify(games));
  return new Response(JSON.stringify(games), { headers: JSON_HEADERS });
}

// DELETE /api/history?index=<arrayIndex>  -> removes just that one game
export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const indexParam = url.searchParams.get('index');
  const index = indexParam !== null ? parseInt(indexParam, 10) : NaN;
  const games = await readGames(env);
  if (isNaN(index) || index < 0 || index >= games.length) {
    return new Response(JSON.stringify({ error: 'invalid index' }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }
  games.splice(index, 1);
  await env.HISTORY.put('games', JSON.stringify(games));
  return new Response(JSON.stringify(games), { headers: JSON_HEADERS });
}
