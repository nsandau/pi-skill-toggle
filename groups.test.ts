import { describe, expect, it } from "bun:test";
import { groupRows, toggleGroup, type GroupSkill, type SkillMode } from "./groups.ts";

const skills: GroupSkill[] = [
	{ name: "a", source: "owner/repo", mode: "enabled" },
	{ name: "b", source: "owner/repo", mode: "disabled" },
	{ name: "local", source: "Local skills", mode: "enabled" },
];

describe("source group actions", () => {
	it("makes source headings navigable rows", () => {
		expect(groupRows(skills).map(row => row.kind === "group" ? row.source : row.skill.name))
			.toEqual(["owner/repo", "a", "b", "Local skills", "local"]);
	});

	it("hides an entire source and restores it on a second toggle", () => {
		const changes = new Map<string, SkillMode>();
		toggleGroup(skills, "owner/repo", changes, "hide");
		expect([...changes]).toEqual([["a", "hidden"], ["b", "hidden"]]);
		toggleGroup(skills, "owner/repo", changes, "hide");
		expect([...changes]).toEqual([["b", "enabled"]]);
		expect(changes.has("local")).toBe(false);
	});

	it("disables every member including search-hidden skills and re-enables all", () => {
		const changes = new Map<string, SkillMode>();
		// The UI passes allSkills, not the filtered rows.
		toggleGroup(skills, "owner/repo", changes, "disable");
		expect([...changes]).toEqual([["a", "disabled"]]);
		toggleGroup(skills, "owner/repo", changes, "disable");
		expect([...changes]).toEqual([["b", "enabled"]]);
	});

	it("handles a mixed pending state and leaves other groups untouched", () => {
		const changes = new Map<string, SkillMode>([["a", "hidden"], ["local", "disabled"]]);
		toggleGroup(skills, "owner/repo", changes, "hide");
		expect([...changes]).toEqual([["a", "hidden"], ["local", "disabled"], ["b", "hidden"]]);
	});
});
