import zlib from "node:zlib";

export interface ZipEntry {
  path: string;
  data: Buffer | string;
}

// Table CRC-32 pré-calculée standard IEEE 802.3
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

export function calculateCrc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2)) & 0x1f);

  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);

  return { dosTime, dosDate };
}

/**
 * Crée une archive ZIP valide (PKZIP 2.0) en mémoire à partir d'une liste d'entrées.
 * Compresse les fichiers texte et conserve le binaire (Deflate raw).
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const now = new Date();
  const { dosTime, dosDate } = getDosDateTime(now);

  const localFileChunks: Buffer[] = [];
  const centralDirChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const rawBuffer = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf-8");
    const crc = calculateCrc32(rawBuffer);
    const uncompressedSize = rawBuffer.length;

    // Normalisation du chemin (séparateurs slash '/', sans slash initial)
    const normalizedPath = entry.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const fileNameBuffer = Buffer.from(normalizedPath, "utf-8");

    // Compression Deflate Raw (sans headers zlib)
    let compressedData: Buffer;
    let compressionMethod = 8; // Deflate

    try {
      compressedData = zlib.deflateRawSync(rawBuffer, { level: 6 });
      // Si la compression est plus grosse que l'original (ex: petit fichier ou déjà compressé), stocker sans compression
      if (compressedData.length >= uncompressedSize) {
        compressedData = rawBuffer;
        compressionMethod = 0; // Store
      }
    } catch {
      compressedData = rawBuffer;
      compressionMethod = 0;
    }

    const compressedSize = compressedData.length;

    // 1. Local File Header (30 octets + nom de fichier + données)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // Flags: UTF-8 filename flag (bit 11)
    localHeader.writeUInt16LE(compressionMethod, 8); // Compression method
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length

    const localChunk = Buffer.concat([localHeader, fileNameBuffer, compressedData]);
    localFileChunks.push(localChunk);

    // 2. Central Directory File Header (46 octets + nom de fichier)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central header signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // Flags: UTF-8 filename
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header

    const centralChunk = Buffer.concat([centralHeader, fileNameBuffer]);
    centralDirChunks.push(centralChunk);

    offset += localChunk.length;
  }

  const centralDirectoryBuffer = Buffer.concat(centralDirChunks);
  const centralDirSize = centralDirectoryBuffer.length;
  const centralDirOffset = offset;
  const entriesCount = entries.length;

  // 3. End of Central Directory Record (22 octets)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk with central directory
  eocd.writeUInt16LE(entriesCount, 8); // Total entries on this disk
  eocd.writeUInt16LE(entriesCount, 10); // Total entries in central directory
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // ZIP comment length

  return Buffer.concat([...localFileChunks, centralDirectoryBuffer, eocd]);
}
