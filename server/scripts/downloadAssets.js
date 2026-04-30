#!/usr/bin/env node
/**
 * Download Base44 and high-priority external assets to local storage.
 * Reads URL list from /tmp/all_urls.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const URL_LIST_PATH = '/tmp/all_urls.json';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_DIR = join(__dirname, '..', 'uploads'); // server/uploads
const BASE44_DIR = join(BASE_DIR, 'base44');
const EXTERNAL_DIR = join(BASE_DIR, 'external');
const LOG_PATH = join(BASE_DIR, 'download-log.json');

const DELAY_MS = 150;
const MAX_RETRIES = 3;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadFile(url, destPath, retries = 0) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const fileStream = createWriteStream(destPath);
    await pipeline(response.body, fileStream);

    const stats = existsSync(destPath) ? readFileSync(destPath).length : 0;
    return { success: true, size: stats };
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await sleep(1000 * (retries + 1));
      return downloadFile(url, destPath, retries + 1);
    }
    return { success: false, error: err.message };
  }
}

function getFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop();
    return name || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main() {
  console.log('📥 Asset Download Starting...\n');

  const data = JSON.parse(readFileSync(URL_LIST_PATH, 'utf-8'));
  const allUrls = data.urls;

  // Filter: Base44 URLs + high-priority external
  const base44Urls = allUrls.filter(u => u.includes('base44.app') || u.includes('base44.com'));
  const externalUrls = allUrls.filter(u =>
    u.includes('storage.rm.otter.productions') &&
    u.includes('1775042677733_billbord.png')
  );

  const toDownload = [
    ...base44Urls.map(u => ({ url: u, dir: BASE44_DIR })),
    ...externalUrls.map(u => ({ url: u, dir: EXTERNAL_DIR }))
  ];

  console.log(`Base44 files: ${base44Urls.length}`);
  console.log(`External files: ${externalUrls.length}`);
  console.log(`Total to download: ${toDownload.length}\n`);

  let successCount = 0;
  let failCount = 0;
  const failures = [];
  const successes = [];

  for (let i = 0; i < toDownload.length; i++) {
    const { url, dir } = toDownload[i];
    const filename = getFilenameFromUrl(url);
    const destPath = join(dir, filename);

    const progress = `[${String(i + 1).padStart(toDownload.length.toString().length)}/${toDownload.length}]`;
    process.stdout.write(`${progress} ${filename.padEnd(50)} `);

    if (existsSync(destPath)) {
      process.stdout.write('SKIP (exists)\n');
      successCount++;
      successes.push({ url, file: filename, status: 'skipped' });
      continue;
    }

    const result = await downloadFile(url, destPath);

    if (result.success) {
      process.stdout.write(`OK (${(result.size / 1024).toFixed(1)} KB)\n`);
      successCount++;
      successes.push({ url, file: filename, size: result.size });
    } else {
      process.stdout.write(`FAIL: ${result.error}\n`);
      failCount++;
      failures.push({ url, file: filename, error: result.error });
    }

    if (i < toDownload.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const log = {
    timestamp: new Date().toISOString(),
    total: toDownload.length,
    success: successCount,
    failed: failCount,
    successes,
    failures
  };

  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Success:  ${successCount}`);
  console.log(`Failed:   ${failCount}`);
  console.log(`Log file: ${LOG_PATH}`);

  if (failures.length > 0) {
    console.log('\nFailed URLs:');
    for (const f of failures) {
      console.log(`  ${f.url}`);
      console.log(`    → ${f.error}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
