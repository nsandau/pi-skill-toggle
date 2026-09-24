import { describe, expect, it } from "bun:test";
import { formatSkillsForPrompt, type Skill } from "@mariozechner/pi-coding-agent";
import { estimateStartupTokenCount, parseSkillMetadata, skillEntry } from "./tokens.ts";

describe("skill metadata", () => {
	it("parses folded multiline YAML, quotes, CRLF, and hidden state", () => {
		const content = '---\r\nname: "example: skill"\r\ndescription: >-\r\n  First line\r\n  second line\r\ndisable-model-invocation: true\r\n---\r\nbody';
		expect(parseSkillMetadata(content, "fallback")).toEqual({
			name: "example: skill",
			description: "First line second line",
			disableModelInvocation: true,
		});
	});

	it("uses Pi's fallback name and excludes missing descriptions", () => {
		expect(parseSkillMetadata("---\ndescription: ''\n---\n", "fallback")).toEqual({
			name: "fallback",
			description: "",
			disableModelInvocation: false,
		});
	});
});

describe("startup tokens", () => {
	it("counts Pi's escaped XML entry, not the shared catalog wrapper", () => {
		const skill = { name: "A&B", description: "Quoted: <yes> & 'maybe'", filePath: "/tmp/a/SKILL.md", disableModelInvocation: false } as Skill;
		const prompt = formatSkillsForPrompt([skill]);
		const entry = skillEntry(skill.name, skill.description, skill.filePath);
		expect(prompt).toContain(entry);
		expect(entry).toContain("<name>A&amp;B</name>");
		expect(entry).toContain("&lt;yes&gt; &amp; &apos;maybe&apos;");
		expect(estimateStartupTokenCount(skill.name, skill.description, skill.filePath))
			.toBe(Math.ceil(entry.length / 4));
	});
});
