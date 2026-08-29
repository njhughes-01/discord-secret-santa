import { createApp } from './app.js';
import { getDb } from './db.js';

const db = getDb();
const app = createApp(db);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🎄 Secret Santa Server is listening on http://${HOST}:${PORT} (LAN & Localhost accessible)`);
  console.log(`🔒 Anti-robot protection active (X-Robots-Tag: noindex, nofollow)`);
});
