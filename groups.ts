export type SkillMode = "enabled" | "hidden" | "disabled";

export interface GroupSkill {
	name: string;
	source: string;
	mode: SkillMode;
}

export type SkillRow<T extends GroupSkill> =
	| { kind: "group"; source: string }
	| { kind: "skill"; skill: T };

export function groupRows<T extends GroupSkill>(skills: T[]): SkillRow<T>[] {
	const rows: SkillRow<T>[] = [];
	let previousSource: string | undefined;
	for (const skill of skills) {
		if (previousSource !== skill.source) {
			rows.push({ kind: "group", source: skill.source });
			previousSource = skill.source;
		}
		rows.push({ kind: "skill", skill });
	}
	return rows;
}

export function effectiveMode(skill: GroupSkill, changes: Map<string, SkillMode>): SkillMode {
	return changes.get(skill.name) ?? skill.mode;
}

/** A header acts on its entire source, not only search matches. */
export function toggleGroup<T extends GroupSkill>(
	skills: T[], source: string, changes: Map<string, SkillMode>, action: "hide" | "disable"
): void {
	const members = skills.filter(skill => skill.source === source);
	if (!members.length) return;
	const off = action === "hide" ? "hidden" : "disabled";
	const next: SkillMode = members.every(skill => effectiveMode(skill, changes) === off) ? "enabled" : off;
	for (const skill of members) {
		if (next === skill.mode) changes.delete(skill.name);
		else changes.set(skill.name, next);
	}
}
