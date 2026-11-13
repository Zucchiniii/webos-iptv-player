#!/usr/bin/env node

import { createHash } from 'crypto';
import { basename, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const packageInfo = JSON.parse(readFileSync('package.json', 'utf8'));
const appInfo = JSON.parse(readFileSync('appinfo.json', 'utf8'));

if (appInfo.version !== packageInfo.version) {
  throw new Error(
    `Version mismatch: package.json is ${packageInfo.version}, appinfo.json is ${appInfo.version}`,
  );
}

const expectedIpk = `${appInfo.id}_${packageInfo.version}_all.ipk`;
const ipkPath = resolve(process.argv[2] || expectedIpk);
const outputPath = resolve(process.argv[3] || `${appInfo.id}.manifest.json`);

if (basename(ipkPath) !== expectedIpk) {
  throw new Error(`Expected IPK filename ${expectedIpk}, received ${basename(ipkPath)}`);
}

const ipkHash = createHash('sha256').update(readFileSync(ipkPath)).digest('hex');

// Homebrew Channel keeps an icon it has loaded for as long as it runs,
// keyed by URL, so the URL names the art: the packaged icon's suffix
// (icon-<art>.png, renamed whenever the art changes).
const art = /^icon-(.+)\.png$/.exec(appInfo.icon)?.[1];
const iconUri = 'https://raw.githubusercontent.com/Zucchiniii/webos-iptv-player/main/assets/icon130.png'
  + (art ? `?art=${art}` : '');

const manifest = {
  id: appInfo.id,
  version: packageInfo.version,
  type: appInfo.type,
  title: appInfo.title,
  appDescription: appInfo.appDescription,
  iconUri,
  sourceUrl: 'https://github.com/Zucchiniii/webos-iptv-player',
  rootRequired: false,
  ipkUrl: basename(ipkPath),
  ipkHash: {
    sha256: ipkHash,
  },
};

writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Generated ${basename(outputPath)} for ${basename(ipkPath)}`);

// The repository listing is what Homebrew Channel's app list draws.
const repositoryPath = 'homebrew-repository.json';
const repository = JSON.parse(readFileSync(repositoryPath, 'utf8'));
const listed = repository.packages.find((pkg) => pkg.id === appInfo.id);
if (listed && listed.iconUri !== iconUri) {
  listed.iconUri = iconUri;
  writeFileSync(repositoryPath, JSON.stringify(repository, null, 2) + '\n');
  console.log(`Updated the icon URL in ${repositoryPath}`);
}
