import { getSignatorySettings } from './dist/server.cjs';
async function run() {
  await getSignatorySettings();
}
run();
