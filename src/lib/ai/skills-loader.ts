import * as fs from "fs";
import * as path from "path";

export interface LoadedSkill {
  name: string;
  description: string;
  systemPrompt: string;
  prompt: string;
  version: string;
}

const SKILL_CACHE = new Map<string, { rawContent: string; frontmatter: Record<string, string>; body: string }>();

/**
 * Charge un prompt LLM externalisé au format Markdown depuis le dossier `skills/<skillName>/SKILL.md`.
 * Respecte rigoureusement la règle Zero Hardcoding.
 */
export function loadSkillPrompt(
  skillName: string,
  variables: Record<string, string | number | undefined | null> = {}
): LoadedSkill {
  let cached = SKILL_CACHE.get(skillName);

  if (!cached) {
    const filePath = path.join(process.cwd(), "skills", skillName, "SKILL.md");
    let fileContent = "";

    if (fs.existsSync(filePath)) {
      fileContent = fs.readFileSync(filePath, "utf-8");
    } else {
      const fallbackPath = path.resolve(process.cwd(), "src", "skills", skillName, "SKILL.md");
      if (fs.existsSync(fallbackPath)) {
        fileContent = fs.readFileSync(fallbackPath, "utf-8");
      }
    }

    if (!fileContent) {
      throw new Error(`[SkillsLoader] Le fichier SKILL.md pour la compétence "${skillName}" est introuvable.`);
    }

    // Parsing du frontmatter YAML simple
    const frontmatter: Record<string, string> = {};
    let body = fileContent;

    const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
      const yamlBlock = match[1];
      body = match[2];

      yamlBlock.split("\n").forEach((line) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          frontmatter[key] = val;
        }
      });
    }

    cached = { rawContent: fileContent, frontmatter, body };
    SKILL_CACHE.set(skillName, cached);
  }

  // Remplacement des variables dynamiques {{key}}
  let processedPrompt = cached.body;
  let processedSystemPrompt = cached.frontmatter.systemPrompt || "";

  Object.entries(variables).forEach(([key, val]) => {
    const stringVal = val !== undefined && val !== null ? String(val) : "";
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    processedPrompt = processedPrompt.replace(placeholder, stringVal);
    processedSystemPrompt = processedSystemPrompt.replace(placeholder, stringVal);
  });

  // Nettoyer d'éventuels placeholders non renseignés
  processedPrompt = processedPrompt.replace(/\{\{\s*[\w.-]+\s*\}\}/g, "").trim();

  return {
    name: cached.frontmatter.name || skillName,
    description: cached.frontmatter.description || "",
    systemPrompt: processedSystemPrompt,
    prompt: processedPrompt,
    version: cached.frontmatter.version || "1.0.0",
  };
}
