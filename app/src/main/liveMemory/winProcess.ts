// Read-only Windows process access via koffi FFI to kernel32.
// Runs in the live-memory utilityProcess only — never on the main thread.
// OpenProcess(QUERY_INFORMATION | VM_READ) + ReadProcessMemory: no writes, no injection.

import { execFileSync } from "node:child_process";
import koffi from "koffi";
import type { MemoryReader } from "../../core/liveMemory/memory";

const kernel32 = koffi.load("kernel32.dll");

const TH32CS_SNAPPROCESS = 0x00000002;
const TH32CS_SNAPMODULE = 0x00000008;
const TH32CS_SNAPMODULE32 = 0x00000010;
const PROCESS_QUERY_INFORMATION = 0x0400;
const PROCESS_VM_READ = 0x0010;

const MEM_COMMIT = 0x1000;
const PAGE_NOACCESS = 0x01;
const PAGE_GUARD = 0x100;

const READABLE_PROTECT = new Set([
  0x02, // PAGE_READONLY
  0x04, // PAGE_READWRITE
  0x08, // PAGE_WRITECOPY
  0x20, // PAGE_EXECUTE_READ
  0x40, // PAGE_EXECUTE_READWRITE
  0x80, // PAGE_EXECUTE_WRITECOPY
]);

// Win64 MSVC layout — padding fields required for correct offsets.
const PROCESSENTRY32W = koffi.struct("PROCESSENTRY32W", {
  dwSize: "uint32",
  cntUsage: "uint32",
  th32ProcessID: "uint32",
  _pad0: koffi.array("uint8", 4),
  th32DefaultHeapID: "uintptr",
  th32ModuleID: "uint32",
  cntThreads: "uint32",
  th32ParentProcessID: "uint32",
  pcPriClassBase: "int32",
  dwFlags: "uint32",
  szExeFile: koffi.array("uint16", 260),
});

const MODULEENTRY32W = koffi.struct("MODULEENTRY32W", {
  dwSize: "uint32",
  th32ModuleID: "uint32",
  th32ProcessID: "uint32",
  GlblcntUsage: "uint32",
  ProccntUsage: "uint32",
  modBaseAddr: "uintptr",
  modBaseSize: "uint32",
  _pad0: koffi.array("uint8", 4),
  hModule: "uintptr",
  szModule: koffi.array("uint16", 256),
  szExePath: koffi.array("uint16", 260),
});

const MEMORY_BASIC_INFORMATION = koffi.struct("MEMORY_BASIC_INFORMATION", {
  BaseAddress: "uintptr",
  AllocationBase: "uintptr",
  AllocationProtect: "uint32",
  PartitionId: "uint16",
  _pad0: koffi.array("uint8", 2),
  RegionSize: "uintptr",
  State: "uint32",
  Protect: "uint32",
  Type: "uint32",
});

const CreateToolhelp32Snapshot = kernel32.func("CreateToolhelp32Snapshot", "void *", [
  "uint32",
  "uint32",
]);
const Process32FirstW = kernel32.func("Process32FirstW", "bool", ["void *", "void *"]);
const Process32NextW = kernel32.func("Process32NextW", "bool", ["void *", "void *"]);
const Module32FirstW = kernel32.func("Module32FirstW", "bool", ["void *", "void *"]);
const Module32NextW = kernel32.func("Module32NextW", "bool", ["void *", "void *"]);
const CloseHandle = kernel32.func("CloseHandle", "bool", ["void *"]);
const OpenProcess = kernel32.func("OpenProcess", "void *", ["uint32", "bool", "uint32"]);
const ReadProcessMemory = kernel32.func("ReadProcessMemory", "bool", [
  "void *",
  "uintptr",
  "void *",
  "uintptr",
  "_Out_ uintptr *",
]);
const VirtualQueryEx = kernel32.func("VirtualQueryEx", "uintptr", [
  "void *",
  "uintptr",
  "void *",
  "uintptr",
]);
const GetExitCodeProcess = kernel32.func("GetExitCodeProcess", "bool", [
  "void *",
  "_Out_ uint32 *",
]);

const STILL_ACTIVE = 259;

function isInvalidHandle(handle: unknown): boolean {
  if (handle == null) return true;
  if (handle === 0 || handle === -1) return true;
  if (typeof handle === "bigint" && (handle === 0n || handle === -1n)) return true;
  return false;
}

function initStruct(ptr: unknown, type: unknown, fields: Record<string, unknown>): void {
  koffi.encode(ptr, type as never, fields);
}

function utf16ArrayToString(arr: number[]): string {
  const chars: string[] = [];
  for (const code of arr) {
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join("");
}

function normalizeProcessName(name: string): string {
  return name.toLowerCase().replace(/\.exe$/i, "");
}

export interface ProcessInfo {
  pid: number;
  name: string;
}

export interface ModuleInfo {
  name: string;
  path: string;
  baseAddress: bigint;
  size: number;
}

export interface MemoryRegion {
  baseAddress: bigint;
  size: number;
  protect: number;
  type: number;
}

export class WinProcess implements MemoryReader {
  readonly pid: number;
  readonly name: string;
  private handle: unknown;

  private constructor(pid: number, name: string, handle: unknown) {
    this.pid = pid;
    this.name = name;
    this.handle = handle;
  }

  static listProcesses(): ProcessInfo[] {
    const snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (isInvalidHandle(snap)) {
      throw new Error("CreateToolhelp32Snapshot(PROCESS) failed.");
    }
    const entry = koffi.alloc(PROCESSENTRY32W, 1);
    initStruct(entry, PROCESSENTRY32W, { dwSize: koffi.sizeof(PROCESSENTRY32W) });
    const out: ProcessInfo[] = [];
    try {
      if (Process32FirstW(snap, entry)) {
        do {
          const decoded = koffi.decode(entry, PROCESSENTRY32W);
          out.push({
            pid: decoded.th32ProcessID,
            name: utf16ArrayToString(decoded.szExeFile),
          });
        } while (Process32NextW(snap, entry));
      }
    } finally {
      CloseHandle(snap);
    }
    return out;
  }

  /** PowerShell fallback when Toolhelp32 enumeration fails or returns nothing. */
  static findViaPowerShell(names: string[]): ProcessInfo | null {
    const stems = [...new Set(names.map((n) => normalizeProcessName(n)))];
    const pattern = stems.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const script = [
      `$p = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match '^(?:${pattern})$' }`,
      "if (-not $p) { exit 1 }",
      "if ($p -is [array]) { $p = $p | Sort-Object Id -Descending | Select-Object -First 1 }",
      "$p | Select-Object Id, ProcessName | ConvertTo-Json -Compress",
    ].join("; ");
    try {
      const raw = execFileSync("powershell", ["-NoProfile", "-Command", script], {
        encoding: "utf-8",
        windowsHide: true,
      }).trim();
      const parsed = JSON.parse(raw) as { Id?: number; ProcessName?: string };
      if (!parsed.Id || !parsed.ProcessName) return null;
      return { pid: parsed.Id, name: `${parsed.ProcessName}.exe` };
    } catch {
      return null;
    }
  }

  static findByNames(names: string[]): WinProcess | null {
    const wanted = new Set(names.flatMap((n) => [n.toLowerCase(), normalizeProcessName(n)]));

    let matches: ProcessInfo[] = [];
    try {
      matches = WinProcess.listProcesses().filter(
        (p) => wanted.has(p.name.toLowerCase()) || wanted.has(normalizeProcessName(p.name)),
      );
    } catch {
      // fall through to PowerShell
    }

    if (matches.length === 0) {
      const viaPs = WinProcess.findViaPowerShell(names);
      if (viaPs) matches = [viaPs];
    }

    if (matches.length === 0) return null;
    const pick = matches.sort((a, b) => b.pid - a.pid)[0];
    return WinProcess.open(pick.pid, pick.name);
  }

  static open(pid: number, name: string): WinProcess {
    const handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid);
    if (isInvalidHandle(handle)) {
      throw new Error(`OpenProcess failed for pid ${pid}. Try running as Administrator.`);
    }
    return new WinProcess(pid, name, handle);
  }

  close(): void {
    if (this.handle) {
      CloseHandle(this.handle);
      this.handle = null;
    }
  }

  /** False when the game process has exited (handle is stale). */
  isAlive(): boolean {
    if (isInvalidHandle(this.handle)) return false;
    const code = [0];
    if (!GetExitCodeProcess(this.handle, code)) return false;
    return code[0] === STILL_ACTIVE;
  }

  listModules(): ModuleInfo[] {
    const viaToolhelp = this.listModulesViaToolhelp();
    return viaToolhelp.length > 0 ? viaToolhelp : this.listModulesViaPowerShell();
  }

  private listModulesViaToolhelp(): ModuleInfo[] {
    const snap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, this.pid);
    if (isInvalidHandle(snap)) return [];
    const entry = koffi.alloc(MODULEENTRY32W, 1);
    initStruct(entry, MODULEENTRY32W, { dwSize: koffi.sizeof(MODULEENTRY32W) });
    const out: ModuleInfo[] = [];
    try {
      if (Module32FirstW(snap, entry)) {
        do {
          const decoded = koffi.decode(entry, MODULEENTRY32W);
          out.push({
            name: utf16ArrayToString(decoded.szModule),
            path: utf16ArrayToString(decoded.szExePath),
            baseAddress: BigInt(decoded.modBaseAddr),
            size: decoded.modBaseSize,
          });
        } while (Module32NextW(snap, entry));
      }
    } finally {
      CloseHandle(snap);
    }
    return out;
  }

  private listModulesViaPowerShell(): ModuleInfo[] {
    const script = [
      `$p = Get-Process -Id ${this.pid} -ErrorAction Stop`,
      "$p.Modules | Select-Object ModuleName, FileName, BaseAddress, ModuleMemorySize | ConvertTo-Json -Compress",
    ].join("; ");
    try {
      const raw = execFileSync("powershell", ["-NoProfile", "-Command", script], {
        encoding: "utf-8",
        windowsHide: true,
      }).trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as
        | {
            ModuleName?: string;
            FileName?: string;
            BaseAddress?: number;
            ModuleMemorySize?: number;
          }
        | {
            ModuleName?: string;
            FileName?: string;
            BaseAddress?: number;
            ModuleMemorySize?: number;
          }[];
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.flatMap((row) => {
        if (!row.ModuleName || row.BaseAddress == null) return [];
        return [
          {
            name: row.ModuleName,
            path: row.FileName ?? "",
            baseAddress: BigInt(row.BaseAddress),
            size: row.ModuleMemorySize ?? 0,
          },
        ];
      });
    } catch {
      return [];
    }
  }

  *readableRegions(maxRegions = 5000): Generator<MemoryRegion> {
    const mbiSize = koffi.sizeof(MEMORY_BASIC_INFORMATION);
    const mbi = koffi.alloc(MEMORY_BASIC_INFORMATION, 1);
    let address = 0n;
    let count = 0;

    while (count < maxRegions) {
      const result = VirtualQueryEx(this.handle, address, mbi, mbiSize);
      if (result === 0n || result === 0) break;

      const info = koffi.decode(mbi, MEMORY_BASIC_INFORMATION);
      const base = BigInt(info.BaseAddress);
      const regionSize = Number(info.RegionSize);
      const protect = info.Protect & 0xff;

      if (
        info.State === MEM_COMMIT &&
        !(protect & PAGE_GUARD) &&
        protect !== PAGE_NOACCESS &&
        READABLE_PROTECT.has(protect) &&
        regionSize > 0
      ) {
        yield {
          baseAddress: base,
          size: regionSize,
          protect,
          type: info.Type,
        };
        count++;
      }

      const next = base + BigInt(regionSize);
      if (next <= address) break;
      address = next;
    }
  }

  readBytes(address: bigint, size: number): Buffer | null {
    const buf = Buffer.alloc(size);
    const outLen = [0n];
    const ok = ReadProcessMemory(this.handle, address, buf, BigInt(size), outLen);
    if (!ok) return null;
    const read = Number(outLen[0]);
    return read === size ? buf : buf.subarray(0, read);
  }
}

export { MEM_COMMIT };
