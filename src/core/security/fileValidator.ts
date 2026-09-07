import { ValidationError } from '../errors/AppError';

export type FileCategory = 'cv' | 'document' | 'image';

export interface FileValidationOptions {
  category: FileCategory;
  maxSizeBytes?: number;
}

export interface FileValidationResult {
  valid: boolean;
  cleanFileName: string;
  fileType: string;
  sizeBytes: number;
  error?: string;
}

// Banned malicious executable/script extensions
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'js', 'mjs', 'vbs', 'ps1', 'jar',
  'asp', 'aspx', 'jsp', 'py', 'pl', 'cgi', 'scr', 'dll', 'so', 'dylib', 'com',
  'hta', 'cpl', 'msi', 'wsf', 'html', 'htm', 'svg'
]);

const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  cv: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/plain'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ],
  image: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
  ]
};

const ALLOWED_EXTENSIONS: Record<FileCategory, string[]> = {
  cv: ['pdf', 'doc', 'docx', 'rtf', 'txt'],
  document: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif']
};

const DEFAULT_SIZE_LIMITS: Record<FileCategory, number> = {
  cv: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024 // 5MB
};

/**
  Sanitize and validate an uploaded file object.
  Guards against path traversal, malicious scripts, double extensions, wrong MIME types, and oversized files.
 */
export function validateUploadedFile(
  file: File | { name: string; type?: string; size?: number },
  category: FileCategory,
  customMaxSize?: number
): FileValidationResult {
  const rawName = file.name || 'unnamed_file';
  const sizeBytes = file.size || 0;
  const fileType = file.type || '';

  // 1. Path traversal & filename sanitization
  const cleanFileName = rawName
    .replace(/^.*[\\/]/, '') // Strip directory paths
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special characters with underscores

  // 2. Check for empty filename
  if (!cleanFileName || cleanFileName.trim() === '') {
    return {
      valid: false,
      cleanFileName: 'file_unnamed',
      fileType,
      sizeBytes,
      error: 'Invalid file name.'
    };
  }

  // 3. Double extension / malicious extension checks
  const nameParts = cleanFileName.split('.');
  if (nameParts.length < 2) {
    return {
      valid: false,
      cleanFileName,
      fileType,
      sizeBytes,
      error: 'File extension is required.'
    };
  }

  const ext = nameParts[nameParts.length - 1].toLowerCase();

  // Check if any part in a multi-dot filename uses a dangerous extension
  for (const part of nameParts.slice(1)) {
    if (DANGEROUS_EXTENSIONS.has(part.toLowerCase())) {
      return {
        valid: false,
        cleanFileName,
        fileType,
        sizeBytes,
        error: `File execution risk detected: Extension '.${part}' is strictly prohibited.`
      };
    }
  }

  // 4. Category-based extension check
  const allowedExts = ALLOWED_EXTENSIONS[category];
  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      cleanFileName,
      fileType,
      sizeBytes,
      error: `Invalid file extension '.${ext}' for ${category.toUpperCase()} uploads. Allowed extensions: ${allowedExts.join(', ')}`
    };
  }

  // 5. MIME Type validation (if provided by client browser)
  if (fileType) {
    const allowedMimes = ALLOWED_MIME_TYPES[category];
    const isMimeAllowed = allowedMimes.some((mime) => fileType.toLowerCase().startsWith(mime));
    if (!isMimeAllowed) {
      return {
        valid: false,
        cleanFileName,
        fileType,
        sizeBytes,
        error: `Unrecognized file content type '${fileType}'. Please upload a valid ${category.toUpperCase()} file.`
      };
    }
  }

  // 6. Size Limit Check
  const maxSize = customMaxSize || DEFAULT_SIZE_LIMITS[category];
  if (sizeBytes > maxSize) {
    const maxMb = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      cleanFileName,
      fileType,
      sizeBytes,
      error: `File size exceeds the maximum permitted limit of ${maxMb}MB.`
    };
  }

  return {
    valid: true,
    cleanFileName,
    fileType: fileType || `application/${ext}`,
    sizeBytes
  };
}

/**
 * Asserts file validity or throws a ValidationError.
 */
export function assertValidFile(
  file: File | { name: string; type?: string; size?: number },
  category: FileCategory,
  customMaxSize?: number
): FileValidationResult {
  const result = validateUploadedFile(file, category, customMaxSize);
  if (!result.valid) {
    throw new ValidationError(result.error || 'File validation failed.');
  }
  return result;
}
