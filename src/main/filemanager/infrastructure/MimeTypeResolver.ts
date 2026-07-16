/**
 * File Manager Infrastructure — MimeTypeResolver
 *
 * Maps file extensions to MIME types.
 * Pure computation — zero imports.
 * Separated so it can be replaced or extended without touching FileEntry types.
 */

const MIME_MAP: Record<string, string> = {
  // Text / Code
  '.ts':    'text/typescript',
  '.tsx':   'text/typescript',
  '.js':    'text/javascript',
  '.jsx':   'text/javascript',
  '.mjs':   'text/javascript',
  '.cjs':   'text/javascript',
  '.json':  'application/json',
  '.html':  'text/html',
  '.css':   'text/css',
  '.scss':  'text/x-scss',
  '.less':  'text/x-less',
  '.xml':   'text/xml',
  '.yaml':  'text/yaml',
  '.yml':   'text/yaml',
  '.toml':  'text/x-toml',
  '.md':    'text/markdown',
  '.txt':   'text/plain',
  '.sh':    'text/x-sh',
  '.bash':  'text/x-sh',
  '.ps1':   'text/x-powershell',
  '.bat':   'text/x-batch',
  '.cmd':   'text/x-batch',
  '.py':    'text/x-python',
  '.rb':    'text/x-ruby',
  '.go':    'text/x-go',
  '.rs':    'text/x-rust',
  '.java':  'text/x-java',
  '.c':     'text/x-c',
  '.cpp':   'text/x-cpp',
  '.h':     'text/x-c-header',
  '.cs':    'text/x-csharp',
  '.swift': 'text/x-swift',
  '.kt':    'text/x-kotlin',
  '.php':   'text/x-php',
  '.sql':   'text/x-sql',
  '.r':     'text/x-r',
  // Images
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.webp':  'image/webp',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.bmp':   'image/bmp',
  '.tiff':  'image/tiff',
  // Documents
  '.pdf':   'application/pdf',
  '.docx':  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx':  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx':  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv':   'text/csv',
  // Archives
  '.zip':   'application/zip',
  '.tar':   'application/x-tar',
  '.gz':    'application/gzip',
  '.7z':    'application/x-7z-compressed',
  '.rar':   'application/x-rar-compressed',
  // Media
  '.mp3':   'audio/mpeg',
  '.wav':   'audio/wav',
  '.mp4':   'video/mp4',
  '.webm':  'video/webm',
  '.mov':   'video/quicktime',
  // Executables / binaries
  '.exe':   'application/x-msdownload',
  '.dll':   'application/x-msdownload',
  '.so':    'application/x-sharedlib',
  '.node':  'application/x-node',
};

export function resolveMimeType(extension: string): string {
  return MIME_MAP[extension.toLowerCase()] ?? 'application/octet-stream';
}
