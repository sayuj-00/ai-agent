/**
 * Terminal Controller Infrastructure — ShellResolver
 *
 * Resolves the correct shell executable and arguments for the current platform.
 * Pure computation — zero imports.
 *
 * Design:
 *  - 'auto' picks the best available shell for the platform.
 *  - Each shell has a command wrapper so the user's command string is
 *    forwarded correctly (e.g. powershell -Command "..." vs bash -c "...").
 */

export type ShellChoice = 'powershell' | 'cmd' | 'bash' | 'sh' | 'auto';

export interface ResolvedShell {
  /** The executable to spawn (e.g. "powershell.exe", "/bin/bash") */
  executable: string;
  /** Arguments to pass before the user command (e.g. ["-Command"]) */
  args: string[];
  /** Display name for logging (e.g. "PowerShell") */
  name: string;
}

export const ShellResolver = {
  /**
   * Resolve a shell choice to a concrete executable + arg prefix.
   * 'auto' selects powershell on Windows, bash (or sh) on Unix.
   */
  resolve(choice: ShellChoice = 'auto'): ResolvedShell {
    const platform = process.platform;

    if (choice === 'auto') {
      if (platform === 'win32') {
        return ShellResolver.resolve('powershell');
      }
      // Try bash first; fall back to sh
      return ShellResolver.resolve('bash');
    }

    switch (choice) {
      case 'powershell':
        return {
          executable: 'powershell.exe',
          args: ['-NoProfile', '-NonInteractive', '-Command'],
          name: 'PowerShell',
        };

      case 'cmd':
        return {
          executable: 'cmd.exe',
          args: ['/c'],
          name: 'CMD',
        };

      case 'bash':
        return {
          executable: '/bin/bash',
          args: ['-c'],
          name: 'bash',
        };

      case 'sh':
        return {
          executable: '/bin/sh',
          args: ['-c'],
          name: 'sh',
        };

      default:
        return ShellResolver.resolve('auto');
    }
  },
};
