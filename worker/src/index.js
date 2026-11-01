export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || 'https://hiakdhs323-cmd.github.io';
    const headers = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ok:true, service:'AonWiki API'}, {headers});
    return Response.json({error:'Not found'}, {status:404, headers});
  }
};
