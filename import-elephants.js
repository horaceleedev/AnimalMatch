import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import PocketBase from 'pocketbase';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8090';
const DEFAULT_AUTH_COLLECTION = 'users';
const DEFAULT_DATA_DIR = path.resolve(process.cwd(), '../test1');
const DEFAULT_SCHEMA_PATH = path.resolve(process.cwd(), '../pb_elephant_schema.json');
const IMPORT_TAG_PREFIX = 'import:test1:';

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.PB_URL || DEFAULT_BASE_URL,
    authCollection: process.env.PB_AUTH_COLLECTION || DEFAULT_AUTH_COLLECTION,
    email: process.env.PB_EMAIL || '',
    password: process.env.PB_PASSWORD || '',
    dataDir: process.env.ELEPHANT_DATA_DIR || DEFAULT_DATA_DIR,
    schemaPath: process.env.PB_SCHEMA_PATH || DEFAULT_SCHEMA_PATH,
    dryRun: false,
    verbose: false,
    placeholderVideoFile: process.env.PB_VIDEO_PLACEHOLDER_FILE || '',
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
        options.dataDir = path.resolve(next);
        i += 1;
        break;
      case '--schema':
        options.schemaPath = path.resolve(next);
        i += 1;
        break;
      case '--video-placeholder-file':
        options.placeholderVideoFile = path.resolve(next);
        i += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node import-elephants.js [options]

Options:
  --base-url <url>               PocketBase base URL (default: ${DEFAULT_BASE_URL})
  --auth-collection <name>       Auth collection for login (default: ${DEFAULT_AUTH_COLLECTION})
  --email <email>                PocketBase login email (or use PB_EMAIL)
  --password <password>          PocketBase login password (or use PB_PASSWORD)
  --data-dir <path>              Directory containing extracted elephant slide folders
  --schema <path>                Path to exported PocketBase schema JSON
  --video-placeholder-file <p>   File to upload into videos.file if that legacy field is still required
  --dry-run                      Validate and report without writing to PocketBase
  --verbose                      Print per-record operations
  --help                         Show this help
`);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'record';
}

function toIsoUtc(value) {
  if (!value) {
    return null;
  }

  const normalized = `${value.trim().replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeAge(value) {
  const mapping = {
    infant: 'infant',
    juvenile: 'juvenile',
    adolescent: 'adolescent',
    adult: 'adult',
    unknown: 'unknown age',
  };
  return mapping[value] || null;
}

function normalizeSex(value) {
  const mapping = {
    male: 'male',
    female: 'female',
    unknown: 'unknown/other sex',
  };
  return mapping[value] || null;
}

function inferAgeFromText(...values) {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  if (text.includes('infant')) return 'infant';
  if (text.includes('juvenile')) return 'juvenile';
  if (text.includes('adolescent')) return 'adolescent';
  if (text.includes('adult')) return 'adult';
  return null;
}

function inferSexFromText(...values) {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  const sexMatch = text.match(/sex[:\s]+(male|female|unknown)/);
  if (sexMatch) return sexMatch[1];
  if (text.includes('adult males')) return 'male';
  if (text.includes('adult females')) return 'female';
  return null;
}

function joinList(values) {
  return unique(values).join(', ');
}

function fieldMap(schema, collectionName) {
  const collection = schema.find((item) => item.name === collectionName);
  if (!collection) {
    throw new Error(`Collection "${collectionName}" not found in schema`);
  }
  return new Map(collection.fields.map((field) => [field.name, field]));
}

function setIfFieldExists(target, fields, fieldName, rawValue) {
  if (!fields.has(fieldName) || rawValue === undefined) {
    return;
  }

  const field = fields.get(fieldName);
  if (rawValue === null) {
    target[fieldName] = null;
    return;
  }

  switch (field.type) {
    case 'json':
      target[fieldName] = rawValue;
      break;
    case 'bool':
      target[fieldName] = Boolean(rawValue);
      break;
    case 'number':
      target[fieldName] = Number(rawValue);
      break;
    case 'select':
      if (Array.isArray(rawValue)) {
        target[fieldName] = rawValue[0] || null;
      } else {
        target[fieldName] = rawValue;
      }
      break;
    case 'text':
    case 'editor':
    case 'email':
    case 'url':
    case 'date':
      if (Array.isArray(rawValue)) {
        target[fieldName] = joinList(rawValue);
      } else {
        target[fieldName] = rawValue;
      }
      break;
    default:
      target[fieldName] = rawValue;
      break;
  }
}

function buildIndividualNotes(slide, identityRecord, individualFields) {
  const sections = [];
  const baseNotes = (slide.notes || '').trim();
  if (baseNotes) {
    sections.push(baseNotes);
  } else if ((slide.descriptions || '').trim()) {
    sections.push(slide.descriptions.trim());
  } else {
    const fallbackNarrative = getNarrativeText(slide);
    if (fallbackNarrative) {
      sections.push(fallbackNarrative);
    }
  }

  const comments = unique(identityRecord.comment || []);
  if (comments.length > 0) {
    sections.push(`Comments: ${comments.join('; ')}`);
  }

  if (!individualFields.has('former_ids') && Array.isArray(slide.former_ids) && slide.former_ids.length > 0) {
    sections.push(`Former IDs: ${slide.former_ids.join(', ')}`);
  }

  if (!individualFields.has('family_group') && Array.isArray(identityRecord.family_group) && identityRecord.family_group.length > 0) {
    sections.push(`Family group: ${joinList(identityRecord.family_group)}`);
  }

  if (!individualFields.has('bond_group') && Array.isArray(identityRecord.bond_group) && identityRecord.bond_group.length > 0) {
    sections.push(`Bond group: ${joinList(identityRecord.bond_group)}`);
  }

  return sections.join('\n\n').trim();
}

function getNarrativeText(slide) {
  const textShapes = slide.text_shapes || [];
  const candidates = textShapes
    .map((shape) => (shape.text || '').trim())
    .filter((text) => (
      text
      && !text.startsWith('ID/Name:')
      && !text.startsWith('Former IDs:')
      && !text.startsWith('Cam/Video')
      && !text.startsWith('Cam/video')
      && !text.startsWith('Characteristics:')
      && !/^Known\b/i.test(text)
      && !/^Prospective\b/i.test(text)
    ));

  return candidates.sort((a, b) => b.length - a.length)[0] || '';
}

function inferIdentityRecord(slide) {
  const heading = (slide.text_shapes || []).map((shape) => shape.text || '').find((text) => /^Known\b|^Prospective\b/i.test(text || '')) || '';
  const narrative = getNarrativeText(slide);
  return {
    age_class: inferAgeFromText(heading, narrative),
    gender: inferSexFromText(heading, narrative),
    family_group: [],
    bond_group: [],
    comment: [],
  };
}

function inferVideoLinksFromTextShapes(slide) {
  const textShapes = slide.text_shapes || [];
  const sourceText = textShapes
    .map((shape) => shape.text || '')
    .find((text) => /Cam\/video names?:|Cam\/Video name:/i.test(text));

  if (!sourceText) {
    return [];
  }

  const match = sourceText.match(/Cam\/video names?:\s*(.+)$/is) || sourceText.match(/Cam\/Video name:\s*(.+)$/is);
  if (!match) {
    return [];
  }

  const suffix = match[1].replace(/\n/g, ' ').trim();
  const tokens = suffix.split(',').map((token) => token.trim()).filter(Boolean);
  const results = [];
  let currentCamera = null;

  for (const token of tokens) {
    const fullMatch = token.match(/^(Cam_[^/]+)\/\s*([A-Za-z0-9_-]+)/i);
    if (fullMatch) {
      currentCamera = fullMatch[1].replace(/\s+/g, '');
      results.push({
        filename: `${currentCamera}/${fullMatch[2]}`,
        unique_id: `${currentCamera.toLowerCase()}/${fullMatch[2].toLowerCase()}`,
        location_name: currentCamera,
        link_in_txt: null,
        folder_path: null,
        recording_date: null,
        custom_tags: [],
      });
      continue;
    }

    const shortMatch = token.match(/^([A-Za-z0-9_-]+)$/);
    if (shortMatch && currentCamera) {
      results.push({
        filename: `${currentCamera}/${shortMatch[1]}`,
        unique_id: `${currentCamera.toLowerCase()}/${shortMatch[1].toLowerCase()}`,
        location_name: currentCamera,
        link_in_txt: null,
        folder_path: null,
        recording_date: null,
        custom_tags: [],
      });
    }
  }

  return results;
}

async function fileToUpload(filePath, uploadName) {
  const buffer = await fs.readFile(filePath);
  return new File([buffer], uploadName || path.basename(filePath), { type: mimeFromPath(filePath) });
}

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.txt') return 'text/plain';
  return 'application/octet-stream';
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    return { width: null, height: null };
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function readPngDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  return pngDimensions(buffer);
}

function deriveFolderFromTxt(linkInTxt) {
  if (!linkInTxt) {
    return null;
  }
  const withoutPrefix = linkInTxt.replace(/^Elephant Monitoring\//, '');
  const segments = withoutPrefix.split('/');
  if (segments.length < 2) {
    return null;
  }
  segments.pop();
  return segments.join('/');
}

async function loadSlides(dataDir) {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const slideDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const slides = [];

  for (const dirName of slideDirs) {
    const slidePath = path.join(dataDir, dirName, 'slide.json');
    const content = await fs.readFile(slidePath, 'utf8');
    const slide = JSON.parse(content);
    slides.push({
      dirName,
      dirPath: path.join(dataDir, dirName),
      slide,
    });
  }

  return slides;
}

function normalizeDataset(slides, schema) {
  const individualFields = fieldMap(schema, 'individuals');
  const cropFields = fieldMap(schema, 'crops');
  const videoFields = fieldMap(schema, 'videos');
  const videosByFilename = new Map();
  const normalizedIndividuals = [];
  const normalizedCrops = [];
  const warnings = {
    missingVideoPath: [],
    missingRecordingDate: [],
    folderPathMismatches: [],
    slidesWithoutVideos: [],
    slidesWithoutIdentityRecords: [],
    ambiguousCropVideo: [],
  };

  for (const { dirName, dirPath, slide } of slides) {
    const videoLinks = slide.video_subject_links?.length ? slide.video_subject_links : inferVideoLinksFromTextShapes(slide);
    const identityRecord = slide.identity_records?.[0] || inferIdentityRecord(slide);

    if (!slide.identity_records?.length) {
      warnings.slidesWithoutIdentityRecords.push({ slide: dirName, name: slide.id_name });
    }

    if (!slide.video_subject_links?.length) {
      warnings.slidesWithoutVideos.push({ slide: dirName, name: slide.id_name });
    }

    for (const videoLink of videoLinks) {
      const filename = videoLink.filename || videoLink.unique_id;
      if (!filename) {
        continue;
      }

      if (!videoLink.link_in_txt) {
        warnings.missingVideoPath.push({ slide: dirName, individual: slide.id_name, filename });
      }
      if (!videoLink.recording_date) {
        warnings.missingRecordingDate.push({ slide: dirName, individual: slide.id_name, filename });
      }

      const derivedFolder = deriveFolderFromTxt(videoLink.link_in_txt);
      if (derivedFolder && videoLink.folder_path && derivedFolder !== videoLink.folder_path) {
        warnings.folderPathMismatches.push({
          slide: dirName,
          filename,
          folder_path: videoLink.folder_path,
          derived_folder: derivedFolder,
        });
      }

      const existing = videosByFilename.get(filename);
      const merged = existing || {
        filename,
        uniqueIds: [],
        location_name: videoLink.location_name || null,
        recording_date: toIsoUtc(videoLink.recording_date),
        custom_tags: [],
        filepath: videoLink.link_in_txt || null,
      };

      merged.uniqueIds = unique([...merged.uniqueIds, videoLink.unique_id]);
      merged.custom_tags = unique([...(merged.custom_tags || []), ...(videoLink.custom_tags || [])]);
      if (!merged.recording_date && videoLink.recording_date) {
        merged.recording_date = toIsoUtc(videoLink.recording_date);
      }
      if (!merged.filepath && videoLink.link_in_txt) {
        merged.filepath = videoLink.link_in_txt;
      }
      if (!merged.location_name && videoLink.location_name) {
        merged.location_name = videoLink.location_name;
      }

      videosByFilename.set(filename, merged);
    }

    const individualNotes = buildIndividualNotes(slide, identityRecord, individualFields);
    const individualVideoFilenames = unique(videoLinks.map((videoLink) => videoLink.filename || videoLink.unique_id));
    normalizedIndividuals.push({
      slideDir: dirName,
      name: slide.id_name,
      is_identified: Boolean(slide.is_identified),
      former_ids: unique(slide.former_ids || []),
      age: normalizeAge(identityRecord.age_class),
      sex: normalizeSex(identityRecord.gender),
      notes: individualNotes || null,
      family_group: unique(identityRecord.family_group || []),
      bond_group: unique(identityRecord.bond_group || []),
      videoFilenames: individualVideoFilenames,
      custom_tags: [],
    });

    const linkedVideoFilenames = unique(videoLinks.map((videoLink) => videoLink.filename || videoLink.unique_id));
    const cropVideoFilename = linkedVideoFilenames.length === 1 ? linkedVideoFilenames[0] : null;

    if ((slide.pictures || []).length > 0 && linkedVideoFilenames.length > 1) {
      warnings.ambiguousCropVideo.push({
        slide: dirName,
        name: slide.id_name,
        videos: linkedVideoFilenames,
        cropCount: slide.pictures.length,
      });
    }

    for (const picture of slide.pictures || []) {
      const imagePath = path.join(dirPath, picture.output_filename);
      const importTag = `${IMPORT_TAG_PREFIX}${dirName}:${picture.output_filename}`;
      normalizedCrops.push({
        slideDir: dirName,
        importTag,
        imagePath,
        imageName: `${slugify(slide.id_name)}_${picture.output_filename}`,
        individualName: slide.id_name,
        sourceVideoFilename: cropVideoFilename,
        crop_coordinates: cropFields.has('crop_coordinates') ? [0, 0, 0, 0] : undefined,
        custom_tags: cropFields.has('custom_tags') ? [importTag] : undefined,
      });
    }
  }

  return {
    videoFields,
    individualFields,
    cropFields,
    videos: [...videosByFilename.values()].sort((a, b) => a.filename.localeCompare(b.filename)),
    individuals: normalizedIndividuals.sort((a, b) => a.name.localeCompare(b.name)),
    crops: normalizedCrops,
    warnings,
  };
}

async function listRecords(pb, collectionName, perPage = 500) {
  return pb.collection(collectionName).getFullList({ perPage });
}

function arraysEqual(a, b) {
  const left = [...(a || [])].sort();
  const right = [...(b || [])].sort();
  return JSON.stringify(left) === JSON.stringify(right);
}

function shouldUpdateRecord(existing, payload) {
  return Object.entries(payload).some(([key, value]) => {
    const current = existing[key];
    if (Array.isArray(value)) {
      return !arraysEqual(current, value);
    }
    return (current ?? null) !== (value ?? null);
  });
}

async function ensureVideoRecords({ pb, dataset, dryRun, verbose, placeholderVideoFile }) {
  const existingVideos = await listRecords(pb, 'videos');
  const existingByFilename = new Map(existingVideos.map((record) => [record.filename, record]));
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    recordsByFilename: new Map(),
  };

  for (const video of dataset.videos) {
    const payload = {
      filename: video.filename,
      location_name: video.location_name,
      recording_date: video.recording_date,
      custom_tags: video.custom_tags,
      annotation_status: 'to annotate',
    };
    setIfFieldExists(payload, dataset.videoFields, 'filepath', video.filepath);

    const existing = existingByFilename.get(video.filename);
    if (existing) {
      if (shouldUpdateRecord(existing, payload)) {
        if (verbose) {
          console.log(`update video ${video.filename}`);
        }
        if (!dryRun) {
          await pb.collection('videos').update(existing.id, payload);
        }
        results.updated += 1;
      } else {
        results.unchanged += 1;
      }
      results.recordsByFilename.set(video.filename, existing.id);
      continue;
    }

    const createPayload = { ...payload };
    if (dataset.videoFields.get('file')?.required) {
      if (!placeholderVideoFile) {
        throw new Error('Schema requires videos.file, but no --video-placeholder-file was provided. Remove the legacy requirement or supply a placeholder file.');
      }
      createPayload.file = await fileToUpload(placeholderVideoFile, `${slugify(video.filename)}${path.extname(placeholderVideoFile) || '.txt'}`);
    }

    if (verbose) {
      console.log(`create video ${video.filename}`);
    }
    if (!dryRun) {
      const created = await pb.collection('videos').create(createPayload);
      results.recordsByFilename.set(video.filename, created.id);
    }
    results.created += 1;
  }

  if (dryRun) {
    for (const record of existingVideos) {
      results.recordsByFilename.set(record.filename, record.id);
    }
  }

  return results;
}

async function ensureIndividualRecords({ pb, dataset, dryRun, verbose, videoIdsByFilename }) {
  const existingIndividuals = await listRecords(pb, 'individuals');
  const existingByName = new Map(existingIndividuals.map((record) => [record.name, record]));
  const results = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: [],
    recordsByName: new Map(),
  };

  for (const individual of dataset.individuals) {
    const videoIds = unique(individual.videoFilenames.map((filename) => videoIdsByFilename.get(filename)).filter(Boolean));
    if (videoIds.length === 0) {
      results.skipped.push({
        name: individual.name,
        reason: 'No linked videos available for required individuals.videos relation',
        slide: individual.slideDir,
      });
      continue;
    }

    const payload = {
      name: individual.name,
      is_identified: individual.is_identified,
      videos: videoIds,
      age: individual.age,
      sex: individual.sex,
      notes: individual.notes,
      custom_tags: individual.custom_tags,
    };
    setIfFieldExists(payload, dataset.individualFields, 'former_ids', individual.former_ids);
    setIfFieldExists(payload, dataset.individualFields, 'family_group', individual.family_group);
    setIfFieldExists(payload, dataset.individualFields, 'bond_group', individual.bond_group);

    const existing = existingByName.get(individual.name);
    if (existing) {
      if (shouldUpdateRecord(existing, payload)) {
        if (verbose) {
          console.log(`update individual ${individual.name}`);
        }
        if (!dryRun) {
          await pb.collection('individuals').update(existing.id, payload);
        }
        results.updated += 1;
      } else {
        results.unchanged += 1;
      }
      results.recordsByName.set(individual.name, existing.id);
      continue;
    }

    if (verbose) {
      console.log(`create individual ${individual.name}`);
    }
    if (!dryRun) {
      const created = await pb.collection('individuals').create(payload);
      results.recordsByName.set(individual.name, created.id);
    }
    results.created += 1;
  }

  if (dryRun) {
    for (const record of existingIndividuals) {
      results.recordsByName.set(record.name, record.id);
    }
  }

  return results;
}

async function ensureCropRecords({ pb, dataset, dryRun, verbose, individualIdsByName, videoIdsByFilename }) {
  const existingCrops = await listRecords(pb, 'crops');
  const existingImportTags = new Set();
  for (const record of existingCrops) {
    for (const tag of record.custom_tags || []) {
      if (typeof tag === 'string' && tag.startsWith(IMPORT_TAG_PREFIX)) {
        existingImportTags.add(tag);
      }
    }
  }

  const results = {
    created: 0,
    skippedExisting: 0,
    skippedMissingIndividual: [],
    missingFiles: [],
  };

  for (const crop of dataset.crops) {
    if (existingImportTags.has(crop.importTag)) {
      results.skippedExisting += 1;
      continue;
    }

    const individualId = individualIdsByName.get(crop.individualName);
    if (!individualId) {
      results.skippedMissingIndividual.push({
        slide: crop.slideDir,
        individual: crop.individualName,
        importTag: crop.importTag,
      });
      continue;
    }

    try {
      await fs.access(crop.imagePath);
    } catch {
      results.missingFiles.push(crop.imagePath);
      continue;
    }

    const { width, height } = await readPngDimensions(crop.imagePath);
    const payload = {
      individual: individualId,
      source_video: crop.sourceVideoFilename ? (videoIdsByFilename.get(crop.sourceVideoFilename) || null) : null,
      custom_tags: crop.custom_tags || [],
      width,
      height,
    };
    setIfFieldExists(payload, dataset.cropFields, 'crop_coordinates', crop.crop_coordinates);

    if (verbose) {
      console.log(`create crop ${crop.importTag}`);
    }

    if (!dryRun) {
      payload.image = await fileToUpload(crop.imagePath, crop.imageName);
      await pb.collection('crops').create(payload);
    }
    results.created += 1;
  }

  return results;
}

function printSummary({ dataset, videoResults, individualResults, cropResults }) {
  console.log('\nImport summary');
  console.log('--------------');
  console.log(`videos: create=${videoResults.created}, update=${videoResults.updated}, unchanged=${videoResults.unchanged}, total_source=${dataset.videos.length}`);
  console.log(`individuals: create=${individualResults.created}, update=${individualResults.updated}, unchanged=${individualResults.unchanged}, skipped=${individualResults.skipped.length}, total_source=${dataset.individuals.length}`);
  console.log(`crops: create=${cropResults.created}, skipped_existing=${cropResults.skippedExisting}, missing_individual=${cropResults.skippedMissingIndividual.length}, missing_files=${cropResults.missingFiles.length}, total_source=${dataset.crops.length}`);

  console.log('\nWarnings');
  console.log('--------');
  console.log(`slides without videos: ${dataset.warnings.slidesWithoutVideos.length}`);
  console.log(`slides without identity records: ${dataset.warnings.slidesWithoutIdentityRecords.length}`);
  console.log(`video links missing txt path: ${dataset.warnings.missingVideoPath.length}`);
  console.log(`video links missing recording date: ${dataset.warnings.missingRecordingDate.length}`);
  console.log(`folder_path mismatches: ${dataset.warnings.folderPathMismatches.length}`);
  console.log(`ambiguous crop source_video assignments: ${dataset.warnings.ambiguousCropVideo.length}`);

  if (individualResults.skipped.length > 0) {
    console.log('\nSkipped individuals');
    for (const item of individualResults.skipped.slice(0, 20)) {
      console.log(`- ${item.name} (${item.slide}): ${item.reason}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const schema = JSON.parse(await fs.readFile(options.schemaPath, 'utf8'));
  const slides = await loadSlides(options.dataDir);
  const dataset = normalizeDataset(slides, schema);

  if (!options.dryRun && (!options.email || !options.password)) {
    throw new Error('PocketBase credentials are required unless you run with --dry-run.');
  }

  console.log(`Loaded ${slides.length} slide folders from ${options.dataDir}`);
  console.log(`Normalized ${dataset.videos.length} videos, ${dataset.individuals.length} individuals, ${dataset.crops.length} crops`);

  let pb = null;
  if (!options.dryRun) {
    pb = new PocketBase(options.baseUrl);
    await pb.collection(options.authCollection).authWithPassword(options.email, options.password);
  } else {
    pb = new PocketBase(options.baseUrl);
  }

  const videoResults = options.dryRun
    ? {
        created: dataset.videos.length,
        updated: 0,
        unchanged: 0,
        recordsByFilename: new Map(),
      }
    : await ensureVideoRecords({
        pb,
        dataset,
        dryRun: options.dryRun,
        verbose: options.verbose,
        placeholderVideoFile: options.placeholderVideoFile,
      });

  const videoIdsByFilename = videoResults.recordsByFilename;
  const individualResults = options.dryRun
    ? {
        created: dataset.individuals.filter((individual) => individual.videoFilenames.length > 0).length,
        updated: 0,
        unchanged: 0,
        skipped: dataset.individuals.filter((individual) => individual.videoFilenames.length === 0).map((individual) => ({
          name: individual.name,
          slide: individual.slideDir,
          reason: 'No linked videos available for required individuals.videos relation',
        })),
        recordsByName: new Map(),
      }
    : await ensureIndividualRecords({
        pb,
        dataset,
        dryRun: options.dryRun,
        verbose: options.verbose,
        videoIdsByFilename,
      });

  const cropResults = options.dryRun
    ? {
        created: dataset.crops.length,
        skippedExisting: 0,
        skippedMissingIndividual: [],
        missingFiles: [],
      }
    : await ensureCropRecords({
        pb,
        dataset,
        dryRun: options.dryRun,
        verbose: options.verbose,
        individualIdsByName: individualResults.recordsByName,
        videoIdsByFilename,
      });

  printSummary({ dataset, videoResults, individualResults, cropResults });
}

main().catch((error) => {
  console.error(`\nImport failed: ${error.message}`);
  process.exitCode = 1;
});
