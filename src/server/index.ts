import { createApp } from './app.js';
import { getDb } from './db.js';

const db = getDb();
const app = createApp(db);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🎄 Secret Santa Server is listening on http://localhost:${PORT}`);
  console.log(`🔒 Anti-robot protection active (X-Robots-Tag: noindex, nofollow)`);
});
