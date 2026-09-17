import { memoryStorage } from "multer";
import { parseApiEnv } from "@elhabak/config";

const env = parseApiEnv(process.env);

/**
 * Hard ceiling applied by Multer *while streaming*, before the file ever reaches the
 * per-module content validators. Without it a multipart body larger than MAX_UPLOAD_MB
 * would be buffered fully into memory first (memoryStorage) and only then rejected - a
 * real memory-exhaustion vector. Multer aborts with LIMIT_FILE_SIZE, which the global
 * exception filter maps to 413.
 */
export const uploadFileSizeLimit = env.MAX_UPLOAD_MB * 1024 * 1024;

export const memoryUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: uploadFileSizeLimit }
};
