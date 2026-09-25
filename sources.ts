import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const LOCAL_SOURCE = "Local skills";

type LockEntry = { source?: unknown; sourceType?: unknown };
type SkillLock = { skills?: Record<string, LockEntry> };

function readLock(lockPath: string): SkillLock {
	try {
		const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
		return lock && typeof lock === "object" && lock.skills && typeof lock.skills === "object"
			? lock as SkillLock : {};
	} catch {
		return {};
	}
}

function realPath(filePath: string): string {
	try {
		return fs.realpathSync(filePath);
	} catch {
		return path.resolve(filePath);
	}
}

/** pi-skills stores provenance by installed directory name, not frontmatter name.
 * Only trust an entry when the skill is physically under the corresponding
 * lock's .agents/skills directory (which may be symlinked to Pi's skills).
 */
export function skillSource(filePath: string, cwd = process.cwd(), home = os.homedir()): string {
	const skillFile = realPath(filePath);
	for (const base of [path.join(cwd, ".agents"), path.join(home, ".agents")]) {
		const root = realPath(path.join(base, "skills"));
		const relative = path.relative(root, skillFile);
		if (relative.startsWith("..") || path.isAbsolute(relative)) continue;
		const parts = relative.split(path.sep);
		if (parts.length !== 2 || parts[1] !== "SKILL.md") continue;
		const entry = readLock(path.join(base, ".skill-lock.json")).skills?.[parts[0]];
		if (entry?.sourceType === "github" && typeof entry.source === "string" && entry.source.trim()) {
			return entry.source;
		}
	}
	return LOCAL_SOURCE;
}

export function compareSources(a: string, b: string): number {
	if (a === LOCAL_SOURCE) return b === LOCAL_SOURCE ? 0 : 1;
	if (b === LOCAL_SOURCE) return -1;
	return a.localeCompare(b);
}
