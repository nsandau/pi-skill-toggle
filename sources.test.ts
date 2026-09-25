import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { compareSources, LOCAL_SOURCE, skillSource } from "./sources.ts";

function fixture(test: (cwd: string, home: string) => void): void {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), "pi-skill-sources-"));
	try {
		const cwd = path.join(base, "project");
		const home = path.join(base, "home");
		fs.mkdirSync(cwd);
		fs.mkdirSync(home);
		test(cwd, home);
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
}

function addSkill(base: string, folder: string): string {
	const dir = path.join(base, ".agents", "skills", folder);
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, "SKILL.md");
	fs.writeFileSync(file, "---\nname: other-name\ndescription: test\n---\n");
	return file;
}

function lock(base: string, skills: object): void {
	fs.mkdirSync(path.join(base, ".agents"), { recursive: true });
	fs.writeFileSync(path.join(base, ".agents", ".skill-lock.json"), JSON.stringify({ version: 3, skills }));
}

describe("pi-skills provenance", () => {
	it("groups GitHub installs by source, using folder rather than frontmatter name", () => fixture((cwd, home) => {
		const file = addSkill(home, "directory-name");
		lock(home, { "directory-name": { sourceType: "github", source: "owner/repo" } });
		expect(skillSource(file, cwd, home)).toBe("owner/repo");
	}));

	it("resolves Pi symlinks to the global skill lock", () => fixture((cwd, home) => {
		const file = addSkill(home, "example");
		lock(home, { example: { sourceType: "github", source: "owner/repo" } });
		const piDir = path.join(home, ".pi", "agent");
		fs.mkdirSync(piDir, { recursive: true });
		fs.symlinkSync(path.dirname(path.dirname(file)), path.join(piDir, "skills"), "dir");
		expect(skillSource(path.join(piDir, "skills", "example", "SKILL.md"), cwd, home)).toBe("owner/repo");
	}));

	it("uses a separate project lock for project skills", () => fixture((cwd, home) => {
		const file = addSkill(cwd, "project-skill");
		lock(cwd, { "project-skill": { sourceType: "github", source: "team/project" } });
		expect(skillSource(file, cwd, home)).toBe("team/project");
	}));

	it("treats unknown, stale, or malformed entries as local", () => fixture((cwd, home) => {
		const file = addSkill(home, "local");
		lock(home, { local: { sourceType: "local", source: "local" }, stale: { sourceType: "github", source: "other/repo" } });
		expect(skillSource(file, cwd, home)).toBe(LOCAL_SOURCE);
		fs.writeFileSync(path.join(home, ".agents", ".skill-lock.json"), "not json");
		expect(skillSource(file, cwd, home)).toBe(LOCAL_SOURCE);
		expect(skillSource(path.join(cwd, "SKILL.md"), cwd, home)).toBe(LOCAL_SOURCE);
	}));

	it("sorts local skills after repositories", () => {
		expect([LOCAL_SOURCE, "z/repo", "a/repo"].sort(compareSources)).toEqual(["a/repo", "z/repo", LOCAL_SOURCE]);
	});
});
