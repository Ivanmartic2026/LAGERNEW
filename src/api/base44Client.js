/**
 * base44Client.js — DEV-läge, pratar med eget backend på localhost:3002
 * Ersätter @base44/sdk utan att ändra import-sökvägarna i resten av appen.
 *
 * Använder /api/apps/local/entities/:EntityName — samma mönster som Base44 SDK
 * förväntar sig. Vite proxiar /api → localhost:3002.
 *
 * base44.entities.Article.list()      → GET  /api/apps/local/entities/Article
 * base44.entities.Article.get(id)     → GET  /api/apps/local/entities/Article/:id
 * base44.entities.Article.create(d)   → POST /api/apps/local/entities/Article
 * base44.entities.Article.update(id)  → PUT  /api/apps/local/entities/Article/:id
 * base44.entities.Article.delete(id)  → DELETE /api/apps/local/entities/Article/:id
 * base44.entities.Article.filter(q)   → GET  /api/apps/local/entities/Article?key=val
 * base44.entities.Article.subscribe() → no-op (returnerar unsubscribe-fn)
 */

const APP_ID = 'local';

function getToken() {
  return localStorage.getItem('lagerai_token') ||
         localStorage.getItem('base44_access_token') ||
         'dev-token-admin';
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

function entityPath(entityName) {
  return `/api/apps/${APP_ID}/entities/${entityName}`;
}

function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

function makeEntityClient(entityName) {
  const basePath = entityPath(entityName);

  return {
    // list(sortOrParams) — sort-sträng skickas som __order_by
    list: (sortOrParams) => {
      let queryParams = {};
      if (typeof sortOrParams === 'string' && sortOrParams) {
        queryParams.__order_by = sortOrParams;
      } else if (typeof sortOrParams === 'object' && sortOrParams) {
        queryParams = sortOrParams;
      }
      return fetch(`${basePath}${buildQueryString(queryParams)}`, {
        headers: authHeaders(),
      }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} från ${basePath}`);
        return r.json();
      }).then(data => Array.isArray(data) ? data : []);
    },

    // filter({ key: val }) → GET /path?key=val
    filter: (params) => {
      return fetch(`${basePath}${buildQueryString(params)}`, {
        headers: authHeaders(),
      }).then(r => r.ok ? r.json() : [])
        .then(data => Array.isArray(data) ? data : []);
    },

    // get(id)
    get: (id) =>
      fetch(`${basePath}/${id}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null),

    // create(data)
    create: (data) =>
      fetch(`${basePath}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      }).then(r => r.json()),

    // update(id, data)
    update: (id, data) =>
      fetch(`${basePath}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
      }).then(r => r.json()),

    // delete(id)
    delete: (id) =>
      fetch(`${basePath}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      }).then(r => r.ok ? true : false),

    // subscribe(callback) — real-time ej tillgängligt, returnerar no-op
    subscribe: (_callback) => {
      return () => {}; // unsubscribe-funktion
    },
  };
}

// Skapa base44-objektet med en Proxy så att base44.entities.NyttNamn fungerar automatiskt
export const base44 = {
  entities: new Proxy({}, {
    get(_, entityName) {
      return makeEntityClient(entityName);
    },
  }),

  // Auth-metoder (används av Layout.jsx m.fl.)
  auth: {
    me: () => Promise.resolve({
      id: 'dev-admin-1',
      email: 'admin@lagerai.se',
      full_name: 'Admin',
      role: 'admin',
    }),
    // DEV-läge: alltid autentiserad
    isAuthenticated: () => Promise.resolve(true),
    login: () => Promise.resolve({ token: 'dev-token-admin' }),
    logout: () => Promise.resolve(),
  },

  // functions.invoke — anropar backend på /api/functions/:name
  // Om funktionen inte finns i dev-backend returneras ett tomt svar utan krasch
  functions: {
    invoke: async (functionName, params = {}) => {
      try {
        const r = await fetch(`/api/v1/functions/${functionName}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(params),
        });
        if (!r.ok) {
          console.warn(`[base44.functions] ${functionName} → HTTP ${r.status} (ej implementerad i dev)`);
          return { data: null };
        }
        const data = await r.json();
        return { data };
      } catch (err) {
        console.warn(`[base44.functions] ${functionName} misslyckades:`, err.message);
        return { data: null };
      }
    },
  },

  // appLogs — no-op i dev-läge
  appLogs: {
    logUserInApp: (_pageName) => Promise.resolve(),
  },

  // Storage (bilduppladdning)
  storage: {
    uploadFile: async (file, _path) => {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(`/api/v1/upload?entity=articles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const d = await r.json();
      return { url: d.url };
    },
  },
};

// Exportera även createClient för bakåtkompatibilitet
export const createClient = () => base44;
export default base44;
