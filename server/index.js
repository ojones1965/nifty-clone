import { FileStorage } from './file-storage.js';

const token = process.env.FLOW_TOKEN;
if (!token) {
  console.error('FLOW_TOKEN is not set; refusing to start');
  process.exit(1);
}

// The store modules read localStorage at call time, but they must not be
// imported until the shim exists, hence the dynamic import below.
globalThis.localStorage = new FileStorage(process.env.DATA_FILE || '/data/flow-data.json');

const { createApp } = await import('./app.js');
const port = Number(process.env.PORT) || 3000;
createApp({ token }).listen(port, '0.0.0.0', () => {
  console.log(`flow-server listening on ${port}`);
});
