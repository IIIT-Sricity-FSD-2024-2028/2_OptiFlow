import path from 'path';
import fs from 'fs';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'optiflow-evidence';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      realtime: { transport: ws },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.warn('[Storage] Failed to initialize Supabase client:', err.message);
  }
}

/**
 * Check if Supabase storage is active and configured
 */
export function isCloudStorageEnabled() {
  return Boolean(supabaseClient);
}

/**
 * Upload a file buffer to Supabase Cloud Storage (with local disk fallback)
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.filePath - Relative storage path (e.g. "company_id/evidence_id/file.pdf")
 * @param {string} options.mimetype - File MIME type
 * @param {string} [options.bucket] - Storage bucket name
 * @returns {Promise<{ storageType: 'supabase'|'local', storagePath: string, fileUrl: string }>}
 */
export async function uploadToStorage({ buffer, filePath, mimetype, bucket = DEFAULT_BUCKET }) {
  // Clean path to prevent directory traversal or malformed keys
  const safePath = filePath.replace(/^\/+/, '');

  if (isCloudStorageEnabled()) {
    try {
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(safePath, buffer, {
          contentType: mimetype || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const storagePath = data?.path || safePath;
      const fileUrl = `supabase://${bucket}/${storagePath}`;

      return {
        storageType: 'supabase',
        storagePath,
        fileUrl,
      };
    } catch (supabaseError) {
      console.error('[Storage] Supabase upload failed, falling back to local storage:', supabaseError.message);
    }
  }

  // Fallback: save to local uploads directory
  const localFileName = `${Date.now()}-${path.basename(safePath)}`;
  const localDest = path.join(uploadDir, localFileName);
  fs.writeFileSync(localDest, buffer);

  return {
    storageType: 'local',
    storagePath: localFileName,
    fileUrl: `/uploads/${localFileName}`,
  };
}

/**
 * Generate a signed URL for reading/downloading a file
 * @param {string} fileUrlOrPath - Full fileUrl (e.g. "supabase://optiflow-evidence/path") or relative path
 * @param {number} [expiresInSeconds=3600] - Expiration in seconds (default 1 hour)
 * @returns {Promise<string|null>} Signed URL or null if local
 */
export async function getStorageSignedUrl(fileUrlOrPath, expiresInSeconds = 3600) {
  if (!fileUrlOrPath) return null;

  // Check if it's a Supabase storage path
  if (fileUrlOrPath.startsWith('supabase://')) {
    const raw = fileUrlOrPath.replace('supabase://', '');
    const slashIdx = raw.indexOf('/');
    const bucket = slashIdx !== -1 ? raw.substring(0, slashIdx) : DEFAULT_BUCKET;
    const pathKey = slashIdx !== -1 ? raw.substring(slashIdx + 1) : raw;

    if (supabaseClient) {
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .createSignedUrl(pathKey, expiresInSeconds);

      if (error) {
        console.error('[Storage] Error creating signed URL:', error.message);
        return null;
      }

      return data?.signedUrl || null;
    }
  }

  return null;
}

/**
 * Delete a file from storage
 * @param {string} fileUrlOrPath 
 */
export async function deleteFromStorage(fileUrlOrPath) {
  if (!fileUrlOrPath) return;

  if (fileUrlOrPath.startsWith('supabase://')) {
    const raw = fileUrlOrPath.replace('supabase://', '');
    const slashIdx = raw.indexOf('/');
    const bucket = slashIdx !== -1 ? raw.substring(0, slashIdx) : DEFAULT_BUCKET;
    const pathKey = slashIdx !== -1 ? raw.substring(slashIdx + 1) : raw;

    if (supabaseClient) {
      try {
        await supabaseClient.storage.from(bucket).remove([pathKey]);
      } catch (err) {
        console.warn('[Storage] Failed to remove file from Supabase:', err.message);
      }
    }
    return;
  }

  // Local fallback deletion
  const filename = path.basename(fileUrlOrPath);
  const localPath = path.join(uploadDir, filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch (_) {}
  }
}
