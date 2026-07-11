import { getSignatorySettings } from './server/database.ts';
async function run() {
  await getSignatorySettings();
}
run();
