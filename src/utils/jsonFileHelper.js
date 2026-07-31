const fs = require('fs/promises');
const path = require('path');

/**
 * JsonFileHelper
 *
 * Wraps read/write access to a single JSON file and guarantees that
 * writes are:
 *   1. Serialized - concurrent callers never interleave writes, because
 *      every write is chained onto an internal promise queue. Node's
 *      event loop is single-threaded, but without this queue two
 *      "read-modify-write" operations (e.g. two DELETE requests arriving
 *      close together) could both read the old array, and the second
 *      write would silently clobber the first.
 *   2. Atomic - each write goes to a temp file first, then renamed
 *      (fs.rename) over the real file. A rename is atomic at the OS
 *      level, so a crash mid-write can never leave expenses.json
 *      truncated or half-written.
 *
 * This keeps the "no database" requirement safe for concurrent requests
 * without needing a real locking library.
 */
class JsonFileHelper {
  constructor(filePath) {
    this.filePath = filePath;
    // Tail of the write queue. Every operation chains onto this so
    // reads/writes against the same file never run out of order.
    this.queue = Promise.resolve();
  }

  /**
   * Reads and parses the JSON file. Returns [] if the file doesn't
   * exist yet (first run) instead of throwing.
   */
  async read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      if (!raw.trim()) return [];
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this._ensureFile();
        return [];
      }
      throw new Error(`Failed to read data file: ${error.message}`);
    }
  }

  /**
   * Overwrites the file with the given data (array/object).
   * Queued + atomic, see class docstring.
   */
  async write(data) {
    // Run the write on the queue, but always leave the queue itself
    // resolved afterwards (via .catch) so a failure here doesn't
    // permanently jam every future read/write behind a rejected
    // promise. The caller still gets the real success/failure via
    // the returned `result` promise.
    const result = this.queue.then(() => this._atomicWrite(data));
    this.queue = result.catch(() => {});
    return result;
  }

  /**
   * Convenience helper for the common "read, mutate, write" pattern.
   * The mutator function receives the current data and must return
   * the new data to persist. The whole operation is queued so two
   * concurrent mutate() calls can never race on the same read.
   *
   * If mutatorFn throws (e.g. "not found"), the file is left
   * untouched and the error is propagated to the caller - but the
   * internal queue is NOT left in a rejected state, so subsequent
   * operations still run normally.
   */
  async mutate(mutatorFn) {
    const result = this.queue.then(async () => {
      const current = await this._readRaw();
      const next = await mutatorFn(current);
      await this._writeRaw(next);
      return next;
    });
    this.queue = result.catch(() => {});
    return result;
  }

  async _readRaw() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      if (!raw.trim()) return [];
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`Failed to read data file: ${error.message}`);
    }
  }

  async _writeRaw(data) {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, this.filePath);
  }

  async _atomicWrite(data) {
    await this._writeRaw(data);
    return data;
  }

  async _ensureFile() {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, '[]', 'utf-8');
  }
}

module.exports = JsonFileHelper;
