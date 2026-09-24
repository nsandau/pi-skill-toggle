import { formatSkillsForPrompt, parseFrontmatter, type Skill } from "@mariozechner/pi-coding-agent";

// Use Pi's own YAML parser so folded descriptions, quotes, and multiline
// frontmatter produce the same metadata Pi sees at startup.
export function parseSkillMetadata(content: string, fallbackName: string): {
	name: string;
	description: string;
	disableModelInvocation: boolean;
} {
	try {
		const { frontmatter } = parseFrontmatter(content);
		return {
			name: typeof frontmatter.name === "string" && frontmatter.name ? frontmatter.name : fallbackName,
			description: typeof frontmatter.description === "string" ? frontmatter.description : "",
			disableModelInvocation: frontmatter["disable-model-invocation"] === true,
		};
	} catch {
		return { name: fallbackName, description: "", disableModelInvocation: false };
	}
}

// Let Pi generate the XML rather than duplicating its escaping/layout.
// Its format includes a shared wrapper, which is not attributable to a skill.
export function skillEntry(name: string, description: string, filePath: string): string {
	const prompt = formatSkillsForPrompt([{
		name,
		description,
		filePath,
		disableModelInvocation: false,
	} as Skill]);
	const start = prompt.indexOf("  <skill>");
	const end = prompt.indexOf("  </skill>", start) + "  </skill>".length;
	return prompt.slice(start, end);
}

// Pi has no public per-model tokenizer. Only the rendered text is exact.
// This matches Pi's own chars/4 fallback used for token-budget estimates.
export function estimateStartupTokenCount(name: string, description: string, filePath: string): number {
	return Math.max(1, Math.ceil(skillEntry(name, description, filePath).length / 4));
}
