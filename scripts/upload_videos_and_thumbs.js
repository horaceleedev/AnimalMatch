import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const CONVERTED_VIDEOS_DIR = '/data/shared/fast/WCF_elephant/converted_videos';
const THUMBS_DIR = '/data/shared/fast/WCF_elephant/thumbs';

function progressBar(current, total, width = 40) {
  const pct = current / total;
  const filled = Math.round(pct * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const percent = (pct * 100).toFixed(1);
  process.stdout.write(`\r[${bar}] ${current}/${total} (${percent}%)`);
  if (current === total) process.stdout.write('\n');
}


async function loginToPocketBase(pb) {
  process.loadEnvFile('.env');
  const { PB_EMAIL, PB_PASSWORD } = process.env;
  try {
    await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD);
  } catch {
    await pb.collection('users').authWithPassword(PB_EMAIL, PB_PASSWORD);
  }
}


async function main() {
  const pb = new PocketBase('http://0.0.0.0:8306');

  await loginToPocketBase(pb);

  let records;
  try {
    records = await pb.collection('videos').getFullList();
  } catch (err) {
    console.error('Failed to fetch records:', err);
    process.exit(1);
  }

  console.log(`Fetched ${records.length} records.`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    progressBar(i, records.length);

    const filepath = record.filepath;
    if (!filepath) {
      skipped++;
      continue;
    }

    const cleanFilepath = filepath.replace(/^Elephant Monitoring\//, '');
    const parsed = path.parse(cleanFilepath);
    const relativePathMp4 = path.join(parsed.dir, parsed.name + '.mp4');
    const relativePathJpg = path.join(parsed.dir, parsed.name + '.jpg');

    const videoPath = path.join(CONVERTED_VIDEOS_DIR, relativePathMp4);
    const thumbPath = path.join(THUMBS_DIR, relativePathJpg);

    if (!fs.existsSync(videoPath)) {
      console.warn(`\nVideo not found for record ${record.id}: ${videoPath}`);
      skipped++;
      continue;
    }

    try {
      const formData = new FormData();

      const videoBuffer = fs.readFileSync(videoPath);
      const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
      formData.append('file', videoBlob, path.basename(videoPath));

      if (fs.existsSync(thumbPath)) {
        const thumbBuffer = fs.readFileSync(thumbPath);
        const thumbBlob = new Blob([thumbBuffer], { type: 'image/jpeg' });
        formData.append('thumbnail', thumbBlob, path.basename(thumbPath));
      } else {
        console.warn(`\nThumbnail not found for record ${record.id}: ${thumbPath}`);
      }

      await pb.collection('videos').update(record.id, formData);
      updated++;
    } catch (err) {
      console.error(`\nError updating record ${record.id} (${filepath}):`, err?.message || err);
      errors++;
    }
  }

  progressBar(records.length, records.length);
  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
}

main();