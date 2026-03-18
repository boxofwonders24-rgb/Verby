const { notarize } = require('@electron/notarize');
const path = require('path');

// Load .env since build process doesn't have dotenv
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_PASSWORD) {
    console.log('Skipping notarization — APPLE_ID or APPLE_APP_PASSWORD not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_PASSWORD,
    teamId: '3AK8389YMS',
  });

  console.log('Notarization complete.');
};
