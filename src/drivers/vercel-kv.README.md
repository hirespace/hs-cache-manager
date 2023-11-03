```ts
import { createClient } from '@vercel/kv';
import VercelKv from '@hirespace/hs-cache-manager/dist/drivers/vercel-kv';
import register from '@hirespace/hs-cache-manager';

const vercel = createClient({
  // Before I realised the package handled serialising, I made the driver handle it.
  automaticDeserialization: false,
  token: process.env['*_REST_API_TOKEN'],
  url: process.env['*_REST_API_URL'],
});

export default register({
  vercel: new VercelKv(vercel),
}, 'vercel');
```
