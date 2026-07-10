import fs from "node:fs";
import path from "node:path";

function ensureDirSync(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function atomicWriteFileSync(filename: string, data: string) {
  const dir = path.dirname(filename);
  ensureDirSync(dir);
  const tmp = `${filename}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, data, "utf8");
  // Windows + synced folders/AV can temporarily lock files and make rename fail (EPERM).
  // Prefer copy-over which tends to be more reliable than rename in these environments.
  try {
    fs.copyFileSync(tmp, filename);
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
    return;
  } catch {
    // Fall back to rename, and as a last resort direct write.
    try {
      fs.renameSync(tmp, filename);
      return;
    } catch {
      try {
        fs.writeFileSync(filename, data, "utf8");
      } finally {
        try {
          fs.unlinkSync(tmp);
        } catch {
          // ignore
        }
      }
    }
  }
}

function safeReadJsonFileSync<T>(filename: string, fallback: T): T {
  try {
    if (!fs.existsSync(filename)) return fallback;
    const raw = fs.readFileSync(filename, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class FileStore<T> {
  private readonly filename: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    baseDir: string,
    name: string,
    private readonly fallback: T
  ) {
    this.filename = path.join(baseDir, name);
  }

  readSync(): T {
    return safeReadJsonFileSync(this.filename, this.fallback);
  }

  async write(next: T): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      atomicWriteFileSync(this.filename, JSON.stringify(next, null, 2));
    });
    return this.writeQueue;
  }
}
