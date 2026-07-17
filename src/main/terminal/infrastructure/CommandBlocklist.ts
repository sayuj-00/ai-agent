/**
 * Terminal Controller Infrastructure — CommandBlocklist
 *
 * Security layer that validates every command before execution.
 * Blocks destructive, privileged, or dangerous shell operations.
 *
 * Pure computation — zero imports.
 * Separated so the blocklist can be audited independently.
 *
 * Design:
 *  - Each rule is a named regex with a human-readable reason.
 *  - Rules are checked in order; first match blocks the command.
 *  - To allow a command: remove its rule here and document why.
 */

export interface BlockResult {
  blocked: boolean;
  reason?: string;
}

interface BlockedRule {
  name: string;
  pattern: RegExp;
  reason: string;
}

// ── Blocked patterns ─────────────────────────────────────────────────────────
const BLOCKED_RULES: BlockedRule[] = [
  // ── Disk-destroying operations ─────────────────────────────────────────────
  {
    name: 'format-disk',
    pattern: /\bformat\s+[a-z]:/i,
    reason: 'Disk format commands are blocked (irreversible data loss).',
  },
  {
    name: 'diskpart',
    pattern: /\bdiskpart\b/i,
    reason: 'diskpart is blocked (risk of partition table destruction).',
  },
  {
    name: 'rd-root',
    pattern: /\b(rd|rmdir)\s+(\/s\s+)?[a-z]:\\/i,
    reason: 'Root directory deletion is blocked.',
  },
  {
    name: 'rm-root',
    pattern: /\brm\s+-rf?\s+\/\s*$/i,
    reason: 'Recursive root deletion is blocked.',
  },

  // ── Registry destruction ───────────────────────────────────────────────────
  {
    name: 'reg-delete-root',
    pattern: /\breg\s+delete\s+hklm\\system\b/i,
    reason: 'Deleting HKLM\\SYSTEM is blocked (system integrity risk).',
  },
  {
    name: 'regedit',
    pattern: /\bregedit\s*\/s\b/i,
    reason: 'Silent registry import (regedit /s) is blocked.',
  },

  // ── Credential theft ──────────────────────────────────────────────────────
  {
    name: 'mimikatz',
    pattern: /\bmimikatz\b/i,
    reason: 'Credential dumping tools are blocked.',
  },
  {
    name: 'sekurlsa',
    pattern: /\bsekurlsa\b/i,
    reason: 'LSASS credential extraction is blocked.',
  },
  {
    name: 'dump-lsass',
    pattern: /\b(procdump|minidump).{0,30}lsass/i,
    reason: 'LSASS process dump is blocked.',
  },

  // ── Privilege escalation ───────────────────────────────────────────────────
  {
    name: 'runas-system',
    pattern: /\brunas\s+\/user:system\b/i,
    reason: 'Running as SYSTEM is blocked.',
  },
  {
    name: 'psexec-system',
    pattern: /\bpsexec\b.{0,30}-s\b/i,
    reason: 'PsExec SYSTEM elevation is blocked.',
  },

  // ── Network backdoors ──────────────────────────────────────────────────────
  {
    name: 'netcat-listen',
    pattern: /\bnc\b.{0,20}-l(vp?)?\s+\d{2,5}/i,
    reason: 'Netcat reverse shell listener is blocked.',
  },
  {
    name: 'powershell-download-exec',
    pattern: /\bpowershell\b.{0,60}\b(downloadstring|downloadfile|iex|invoke-expression)\b/i,
    reason: 'Remote code download+execution pattern is blocked.',
  },

  // ── OS shutdown/restart without explicit flag ─────────────────────────────
  {
    name: 'shutdown-force',
    pattern: /\bshutdown\s+(\/s|\/r|\/f)\b/i,
    reason: 'System shutdown/restart commands are blocked.',
  },
];

export const CommandBlocklist = {
  /**
   * Checks if a command should be blocked.
   * Returns { blocked: false } if safe, { blocked: true, reason } if blocked.
   */
  check(command: string): BlockResult {
    for (const rule of BLOCKED_RULES) {
      if (rule.pattern.test(command)) {
        return { blocked: true, reason: `[${rule.name}] ${rule.reason}` };
      }
    }
    return { blocked: false };
  },

  /** List all rule names for audit purposes */
  listRules(): string[] {
    return BLOCKED_RULES.map(r => r.name);
  },
};
