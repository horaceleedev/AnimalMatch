import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import PocketBase from 'pocketbase';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8090';
const DEFAULT_AUTH_COLLECTION = 'users';
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), '../test2');

function parseArgs(argv) {
  const dataDirArgs = [];
  const options = {
    baseUrl: process.env.PB_URL || DEFAULT_BASE_URL,
    authCollection: process.env.PB_AUTH_COLLECTION || DEFAULT_AUTH_COLLECTION,
    email: process.env.PB_EMAIL || '',
    password: process.env.PB_PASSWORD || '',
    dataDirs: parseDataDirs(process.env.ELEPHANT_DATA_DIRS || process.env.ELEPHANT_DATA_DIR || DEFAULT_DATA_DIR),
    all: false,
    allowAmbiguous: false,
    onlyMismatches: false,
    filter: null,
    format: 'table',
    perPage: 500,
    write: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--base-url':
        options.baseUrl = next;
        i += 1;
        break;
      case '--auth-collection':
        options.authCollection = next;
        i += 1;
        break;
      case '--email':
        options.email = next;
        i += 1;
        break;
      case '--password':
        options.password = next;
        i += 1;
        break;
      case '--data-dir':
        dataDirArgs.push(path.resolve(next));
        i += 1;
        break;
      case '--all':
        options.all = true;
        break;
      case '--allow-ambiguous':
        options.allowAmbiguous = true;
        break;
      case '--only-mismatches':
        options.onlyMismatches = true;
        break;
      case '--filter':
        options.filter = next;
        i += 1;
        break;
      case '--format':
        if (!['table', 'json', 'csv'].includes(next)) {
          throw new Error('--format must be one of: table, json, csv');
        }
        options.format = next;
        i += 1;
        break;
      case '--per-page':
        options.perPage = Number(next);
        i += 1;
        break;
      case '--update':
      case '--write':
        options.write = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (dataDirArgs.length > 0) {
    options.dataDirs = dataDirArgs;
  }

  if (!options.filter) {
    options.filter = options.all ? '' : 'slide_num = 0';
  }

  return options;
}

function parseDataDirs(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

function printHelp() {
  console.log(`Usage: node scripts/sync-elephant-crop-slide-nums.js [options]

Find crop records with slide_num=0, compare them with slide.json, and optionally update slide_num.

Options:
  --base-url <url>               PocketBase base URL (default: ${DEFAULT_BASE_URL})
  --auth-collection <name>       Auth collection for login (default: ${DEFAULT_AUTH_COLLECTION})
  --email <email>                PocketBase login email (or use PB_EMAIL)
  --password <password>          PocketBase login password (or use PB_PASSWORD)
  --data-dir <path>              Directory containing slide folders; repeat for multiple dirs
  --all                          Audit all crops instead of only slide_num=0
  --allow-ambiguous              Allow updates when multiple JSON candidates share the same expected slide_num
  --only-mismatches              Only print mismatches/unmatched rows
  --filter <pb-filter>           Custom PocketBase crops filter
  --format <table|json|csv>      Output format (default: table)
  --per-page <number>            PocketBase page size (default: 500)
  --write, --update              Update mismatched crops in PocketBase; default is dry-run
  --help                         Show this help

Examples:
  PB_EMAIL=editor@example.com PB_PASSWORD=... npm run sync:elephant-crop-slides
  PB_EMAIL=editor@example.com PB_PASSWORD=... npm run sync:elephant-crop-slides -- --write
  PB_EMAIL=editor@example.com PB_PASSWORD=... npm run sync:elephant-crop-slides -- --all --only-mismatches
  PB_EMAIL=editor@example.com PB_PASSWORD=... node scripts/sync-elephant-crop-slide-nums.js --data-dir ../test2 --format csv
`);
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'record';
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
}

function mapPush(map, key, value) {
  const existing = map.get(key) || [];
  existing.push(value);
  map.set(key, existing);
}

async function loadJsonIndex(dataDirs) {
  const records = [];
  const byImportTag = new Map();
  const byDirAndOutput = new Map();
  const byIndividualAndOutput = new Map();
  const bySlugAndOutput = new Map();

  for (const dataDir of dataDirs) {
    const datasetName = path.basename(dataDir);
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    const slideDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    for (const dirName of slideDirs) {
      const jsonPath = path.join(dataDir, dirName, 'slide.json');
      let slide;
      try {
        slide = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
      } catch {
        continue;
      }

      const slideNumbers = Array.isArray(slide.slide_numbers) ? slide.slide_numbers.map(normalizeNumber).filter((value) => value !== null) : [];
      for (const picture of slide.pictures || []) {
        const outputFilename = picture.output_filename;
        if (!outputFilename) {
          continue;
        }

        const pictureSlideNum = normalizeNumber(picture.slide_num);
        const expectedSlideNum = pictureSlideNum ?? (slideNumbers.length === 1 ? slideNumbers[0] : null);
        const record = {
          dataset: datasetName,
          dataDir,
          slideDir: dirName,
          jsonPath,
          individualName: slide.id_name || '',
          individualSlug: slugify(slide.id_name || ''),
          outputFilename,
          expectedSlideNum,
          expectedSource: pictureSlideNum === null ? 'slide_numbers_singleton' : 'picture.slide_num',
          topSlideNumbers: slideNumbers,
        };

        records.push(record);
        byImportTag.set(`import:${datasetName}:${dirName}:${outputFilename}`, record);
        mapPush(byDirAndOutput, `${dirName}::${outputFilename}`, record);
        mapPush(byIndividualAndOutput, `${normalizeName(slide.id_name)}::${outputFilename}`, record);
        mapPush(bySlugAndOutput, `${slugify(slide.id_name)}::${outputFilename}`, record);
      }
    }
  }

  return {
    records,
    byImportTag,
    byDirAndOutput,
    byIndividualAndOutput,
    bySlugAndOutput,
  };
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

function cropImageNames(crop) {
  if (Array.isArray(crop.image)) {
    return crop.image.map((item) => String(item));
  }
  if (crop.image) {
    return [String(crop.image)];
  }
  return [];
}

function inferOutputFilenameFromImage(imageName) {
  const basename = path.basename(imageName);
  const match = basename.match(/(?:^|_)(pic_\d+)(?:_[a-z0-9]+)?\.(png|jpe?g)$/i);
  if (!match) {
    return null;
  }
  return `${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
}

function importTagCandidates(tags, index) {
  const candidates = [];
  for (const tag of tags) {
    const exact = index.byImportTag.get(tag);
    if (exact) {
      candidates.push({ record: exact, method: 'custom_tags.import_tag' });
      continue;
    }

    const match = tag.match(/^import:([^:]+):([^:]+):(.+)$/);
    if (!match) {
      continue;
    }

    const [, , slideDir, outputFilename] = match;
    for (const record of index.byDirAndOutput.get(`${slideDir}::${outputFilename}`) || []) {
      candidates.push({ record, method: 'custom_tags.import_tag_dir' });
    }
  }
  return candidates;
}

function fallbackCandidates(crop, index) {
  const individualName = crop.expand?.individual?.name || '';
  const individualSlug = slugify(individualName);
  const imageNames = cropImageNames(crop);
  const outputFilenames = unique(imageNames.map(inferOutputFilenameFromImage));
  const candidates = [];

  for (const outputFilename of outputFilenames) {
    for (const record of index.byIndividualAndOutput.get(`${normalizeName(individualName)}::${outputFilename}`) || []) {
      candidates.push({ record, method: 'individual_name_and_image' });
    }
    for (const record of index.bySlugAndOutput.get(`${individualSlug}::${outputFilename}`) || []) {
      candidates.push({ record, method: 'individual_slug_and_image' });
    }
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    const key = `${candidate.record.dataDir}::${candidate.record.slideDir}::${candidate.record.outputFilename}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function chooseCandidate(candidates, currentSlideNum) {
  if (candidates.length === 0) {
    return { record: null, method: 'none', ambiguous: false, candidateCount: 0 };
  }
  if (candidates.length === 1) {
    return { ...candidates[0], ambiguous: false, candidateCount: 1 };
  }

  const currentMatches = candidates.filter(({ record }) => record.expectedSlideNum !== null && record.expectedSlideNum === currentSlideNum);
  if (currentMatches.length === 1) {
    return { ...currentMatches[0], ambiguous: true, candidateCount: candidates.length };
  }

  const expectedValues = unique(candidates.map(({ record }) => record.expectedSlideNum).filter((value) => value !== null));
  if (expectedValues.length === 1) {
    return { ...candidates.find(({ record }) => record.expectedSlideNum !== null), ambiguous: true, candidateCount: candidates.length };
  }

  return { record: null, method: 'ambiguous', ambiguous: true, candidateCount: candidates.length };
}

function compareCrop(crop, index) {
  const currentSlideNum = normalizeNumber(crop.slide_num);
  const tags = normalizeTags(crop.custom_tags);
  const directCandidates = importTagCandidates(tags, index);
  const candidates = directCandidates.length > 0 ? directCandidates : fallbackCandidates(crop, index);
  const chosen = chooseCandidate(candidates, currentSlideNum);
  const record = chosen.record;
  const expectedSlideNum = record?.expectedSlideNum ?? null;
  let status = 'match';

  if (!record) {
    status = chosen.ambiguous ? 'ambiguous_match' : 'no_json_match';
  } else if (expectedSlideNum === null) {
    status = 'expected_missing';
  } else if (currentSlideNum !== expectedSlideNum) {
    status = 'mismatch';
  }

  return {
    crop_id: crop.id,
    individual: crop.expand?.individual?.name || crop.individual || '',
    current_slide_num: currentSlideNum,
    expected_slide_num: expectedSlideNum,
    status,
    match_method: chosen.method,
    ambiguous: chosen.ambiguous,
    candidate_count: chosen.candidateCount,
    dataset: record?.dataset || '',
    slide_dir: record?.slideDir || '',
    picture: record?.outputFilename || '',
    expected_source: record?.expectedSource || '',
    top_slide_numbers: record?.topSlideNumbers?.join(',') || '',
    image: cropImageNames(crop).join(','),
    import_tags: tags.filter((tag) => tag.startsWith('import:')).join(','),
  };
}

function updateActionForRow(row, options) {
  if (row.status === 'match') {
    return 'no_change';
  }
  if (row.status !== 'mismatch') {
    return `skip_${row.status}`;
  }
  if (row.expected_slide_num === null) {
    return 'skip_expected_missing';
  }
  if (row.ambiguous && !options.allowAmbiguous) {
    return 'skip_ambiguous';
  }
  return options.write ? 'pending_update' : 'would_update';
}

async function applyUpdates(pb, rows, options) {
  const updatedRows = [];
  for (const row of rows) {
    const action = updateActionForRow(row, options);
    if (action !== 'pending_update') {
      updatedRows.push({ ...row, update_action: action });
      continue;
    }

    try {
      await pb.collection('crops').update(row.crop_id, { slide_num: row.expected_slide_num });
      updatedRows.push({ ...row, update_action: 'updated' });
    } catch (error) {
      updatedRows.push({
        ...row,
        update_action: 'update_failed',
        update_error: formatPocketBaseError(error),
      });
    }
  }
  return updatedRows;
}

function formatPocketBaseError(error) {
  const parts = [];
  if (error?.response?.message) {
    parts.push(error.response.message);
  } else if (error?.message) {
    parts.push(error.message);
  }
  if (error?.response?.data && Object.keys(error.response.data).length > 0) {
    parts.push(`details=${JSON.stringify(error.response.data)}`);
  }
  if (error?.status) {
    parts.push(`status=${error.status}`);
  }
  return parts.join(' | ') || 'Unknown PocketBase error';
}

function summarize(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary[row.status] = (summary[row.status] || 0) + 1;
    return summary;
  }, { total: 0 });
}

function summarizeActions(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary[row.update_action] = (summary[row.update_action] || 0) + 1;
    return summary;
  }, { total: 0 });
}

function shouldKeepRow(row, options) {
  if (!options.onlyMismatches) {
    return true;
  }
  return row.status !== 'match';
}

function printTable({ actionSummary, options, rows, statusSummary }) {
  const columns = [
    'crop_id',
    'individual',
    'current_slide_num',
    'expected_slide_num',
    'status',
    'update_action',
    'match_method',
    'ambiguous',
    'candidate_count',
    'dataset',
    'slide_dir',
    'picture',
    'top_slide_numbers',
    'image',
    'update_error',
  ];

  console.log(`Mode: ${options.write ? 'write' : 'dry-run'}`);
  console.log(`Audited ${statusSummary.total} crop(s): ${formatSummary(statusSummary)}`);
  console.log(`Updates: ${formatSummary(actionSummary)}`);
  console.log(columns.join('\t'));
  for (const row of rows) {
    console.log(columns.map((column) => formatCell(row[column])).join('\t'));
  }
}

function formatSummary(summary) {
  return Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => `${key}=${value}`)
    .join(', ') || 'no rows';
}

function formatCell(value) {
  return value === undefined || value === null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function printCsv(rows) {
  const columns = [
    'crop_id',
    'individual',
    'current_slide_num',
    'expected_slide_num',
    'status',
    'update_action',
    'match_method',
    'ambiguous',
    'candidate_count',
    'dataset',
    'slide_dir',
    'picture',
    'expected_source',
    'top_slide_numbers',
    'image',
    'import_tags',
    'update_error',
  ];
  console.log(columns.join(','));
  for (const row of rows) {
    console.log(columns.map((column) => csvEscape(row[column])).join(','));
  }
}

async function fetchCrops(pb, options) {
  const listOptions = {
    perPage: options.perPage,
    expand: 'individual',
  };
  if (options.filter) {
    listOptions.filter = options.filter;
  }
  return pb.collection('crops').getFullList(listOptions);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.email || !options.password) {
    throw new Error('PocketBase credentials are required. Set PB_EMAIL/PB_PASSWORD or pass --email/--password.');
  }

  const index = await loadJsonIndex(options.dataDirs);
  const pb = new PocketBase(options.baseUrl);
  await pb.collection(options.authCollection).authWithPassword(options.email, options.password);
  const crops = await fetchCrops(pb, options);
  const allRows = crops.map((crop) => compareCrop(crop, index));
  const updatedRows = await applyUpdates(pb, allRows, options);
  const rows = updatedRows.filter((row) => shouldKeepRow(row, options));
  const statusSummary = summarize(updatedRows);
  const actionSummary = summarizeActions(updatedRows);

  if (options.format === 'json') {
    console.log(JSON.stringify({
      mode: options.write ? 'write' : 'dry-run',
      statusSummary,
      actionSummary,
      rows,
    }, null, 2));
    return;
  }
  if (options.format === 'csv') {
    printCsv(rows);
    return;
  }
  printTable({ actionSummary, options, rows, statusSummary });
}

main().catch((error) => {
  console.error(`\nAudit failed: ${error?.message || error}`);
  process.exitCode = 1;
});
