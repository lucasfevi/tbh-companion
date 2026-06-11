// Read appended bytes from a growing log file (Player.log tail).

import { closeSync, openSync, readSync, statSync } from "node:fs";

export interface FileTailReadResult {
  text: string;
  nextOffset: number;
  available: boolean;
}

export function readFileTailUtf8(path: string, offset: number): FileTailReadResult {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    return { text: "", nextOffset: offset, available: false };
  }

  let readFrom = offset;
  if (size < readFrom) readFrom = 0;
  if (size <= readFrom) {
    return { text: "", nextOffset: readFrom, available: true };
  }

  const length = size - readFrom;
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, length, readFrom);
  } finally {
    closeSync(fd);
  }

  return { text: buffer.toString("utf-8"), nextOffset: size, available: true };
}
