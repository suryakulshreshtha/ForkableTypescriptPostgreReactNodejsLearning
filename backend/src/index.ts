import { createApp } from './app';
import { pool } from './db/pool';

const PORT = process.env.PORT || 4000;

const app = createApp(pool);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
