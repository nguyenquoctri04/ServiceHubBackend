import { existsSync } from 'node:fs';
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';

let cachedGpgBinary: string | null = null;

export function clearGpgBinaryCache(): void {
    cachedGpgBinary = null;
}

export function getGpgBinary(forceFresh = false): string {
    if (cachedGpgBinary && !forceFresh) {
        return cachedGpgBinary;
    }

    // 1. Nếu biến môi trường GPG_PATH được chỉ định, ưu tiên sử dụng
    const envPath = process.env.GPG_PATH;
    if (envPath && existsSync(envPath) && !envPath.toLowerCase().includes('git')) {
        cachedGpgBinary = envPath;
        return cachedGpgBinary;
    }

    if (process.platform === 'win32') {
        // 2. Kiểm tra các đường dẫn cài đặt chính thức của GnuPG trên Windows
        const officialCandidates = [
            'C:\\Program Files\\GnuPG\\bin\\gpg.exe',
            'C:\\Program Files (x86)\\GnuPG\\bin\\gpg.exe',
            path.join(process.env.ProgramW6432 || 'C:\\Program Files', 'GnuPG', 'bin', 'gpg.exe'),
            path.join(process.env.ProgramFiles || 'C:\\Program Files', 'GnuPG', 'bin', 'gpg.exe'),
            'C:\\Program Files\\GnuPG\\gpg.exe',
            'C:\\Program Files (x86)\\GnuPG\\gpg.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'GnuPG', 'bin', 'gpg.exe'),
        ];

        for (const candidate of officialCandidates) {
            if (existsSync(candidate)) {
                cachedGpgBinary = candidate;
                return cachedGpgBinary;
            }
        }

        // 3. Kiểm tra gpg trong biến PATH hệ thống qua where.exe
        try {
            const whereOutput = execSync('where.exe gpg', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const foundPaths = whereOutput.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

            // Ưu tiên bản GnuPG Native nếu có trong PATH
            const nativeGpg = foundPaths.find((p: string) => !p.toLowerCase().includes('git'));
            if (nativeGpg && existsSync(nativeGpg)) {
                cachedGpgBinary = nativeGpg;
                return cachedGpgBinary;
            }
            if (foundPaths.length > 0 && existsSync(foundPaths[0])) {
                cachedGpgBinary = foundPaths[0];
                return cachedGpgBinary;
            }
        } catch {
            // where.exe không tìm thấy trong PATH
        }

        // 4. Dự phòng trường hợp chỉ có Git for Windows
        const gitCandidates = [
            'C:\\Program Files\\Git\\usr\\bin\\gpg.exe',
            path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin', 'gpg.exe'),
            path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'usr', 'bin', 'gpg.exe'),
        ];
        for (const candidate of gitCandidates) {
            if (existsSync(candidate)) {
                cachedGpgBinary = candidate;
                return cachedGpgBinary;
            }
        }
    }

    cachedGpgBinary = 'gpg';
    return cachedGpgBinary;
}

export function getGpgAgentBinary(): string | null {
    const gpgBin = getGpgBinary();
    if (gpgBin === 'gpg') {
        return null;
    }
    // GnuPG Native (gnupg-w32 / Gpg4win) manages its own gpg-agent daemon automatically via Windows Named Pipes.
    // Specifying --agent-program or agent-program causes command line parsing and socket errors.
    if (!gpgBin.toLowerCase().includes('git')) {
        return null;
    }
    const dir = path.dirname(gpgBin);
    const candidate = path.join(dir, 'gpg-agent.exe');
    if (existsSync(candidate)) {
        return candidate.replace(/\\/g, '/');
    }
    return null;
}

export function getPinentryBinary(): string | null {
    const gpgBin = getGpgBinary();
    if (gpgBin === 'gpg' || !gpgBin.toLowerCase().includes('git')) {
        return null;
    }
    const dir = path.dirname(gpgBin);
    const candidates = [
        path.join(dir, 'pinentry.exe'),
        path.join(dir, 'pinentry-w32.exe'),
        path.join(dir, 'pinentry-basic.exe'),
    ];
    for (const c of candidates) {
        if (existsSync(c)) {
            return c.replace(/\\/g, '/');
        }
    }
    return null;
}

export function getGpgBaseArgs(): string[] {
    const args = ['--batch', '--no-tty'];
    const agentBin = getGpgAgentBinary();
    if (agentBin) {
        args.push(`--agent-program=${agentBin}`);
    }
    return args;
}

export function getDefaultGnupgHome(): string {
    if (process.env.GNUPGHOME) {
        return process.env.GNUPGHOME.replace(/\\/g, '/');
    }
    if (process.platform === 'win32') {
        return path.join(os.homedir(), '.gnupg_servicehub').replace(/\\/g, '/');
    }
    return '/var/lib/signature-service/gnupg';
}

export function getTempGnupgDir(subDir: 'sign' | 'verify', uuid: string): string {
    if (process.platform === 'win32') {
        return path.join(os.tmpdir(), 'signature-service', subDir, uuid).replace(/\\/g, '/');
    }
    return path.join('/tmp/signature-service', subDir, uuid);
}

export function getGpgEnv(homeDir: string): NodeJS.ProcessEnv {
    const gpgBin = getGpgBinary();
    const normalizedHome = homeDir.replace(/\\/g, '/');
    const env = { ...process.env };

    if (gpgBin !== 'gpg' && path.isAbsolute(gpgBin)) {
        const gpgDir = path.dirname(gpgBin);
        const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
        const currentPath = env[pathKey] || '';
        const pathDelimiter = process.platform === 'win32' ? ';' : ':';

        const paths = currentPath.split(pathDelimiter);
        const hasGpgDir = paths.some((p) => p.toLowerCase() === gpgDir.toLowerCase());
        const updatedPath = hasGpgDir ? currentPath : `${gpgDir}${pathDelimiter}${currentPath}`;

        env[pathKey] = updatedPath;
        env.PATH = updatedPath;
    }

    env.GNUPGHOME = normalizedHome;
    env.LANG = 'en_US.UTF-8';
    env.LC_ALL = 'en_US.UTF-8';

    return env;
}

export async function prepareGnupgHome(homeDir: string): Promise<string> {
    const normalizedHome = homeDir.replace(/\\/g, '/');
    await mkdir(normalizedHome, { recursive: true, mode: 0o700 });

    const agentBin = getGpgAgentBinary();
    const pinentryBin = getPinentryBinary();

    // Do NOT wrap paths in double quotes in GnuPG config files; GnuPG takes quotes literally
    let agentConfContent = 'allow-loopback-pinentry\n';
    if (pinentryBin) {
        agentConfContent += `pinentry-program ${pinentryBin}\n`;
    }
    const agentConfPath = path.join(normalizedHome, 'gpg-agent.conf');
    await writeFile(agentConfPath, agentConfContent, { encoding: 'utf8', mode: 0o600 });

    let gpgConfContent = 'use-agent\npinentry-mode loopback\n';
    if (agentBin) {
        gpgConfContent += `agent-program ${agentBin}\n`;
    }
    const gpgConfPath = path.join(normalizedHome, 'gpg.conf');
    await writeFile(gpgConfPath, gpgConfContent, { encoding: 'utf8', mode: 0o600 });

    // Clean up any stale lock files (or orphaned sockets on Windows)
    try {
        const files = await readdir(normalizedHome);
        for (const file of files) {
            if (file.endsWith('.lock') || (process.platform === 'win32' && file.startsWith('S.gpg-agent'))) {
                await rm(path.join(normalizedHome, file), { force: true });
            }
        }
    } catch {
        // ignore
    }

    return normalizedHome;
}
