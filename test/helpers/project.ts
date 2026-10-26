import { TFile } from "obsidian";

import { buildTimeline, writeTimeline } from "../../src/model/timeline";
import { workflows } from "../../src/model/stores";
import {
  isTimeframeFormat,
  type MultipleSceneDraft,
  type TimeframeFormat,
} from "../../src/model/types";

export type SceneSpec = { name: string; value?: unknown; indent?: number };

export type ProjectOptions = {
  format?: TimeframeFormat;
  tag?: string;
  scenes: SceneSpec[];
  target?: string | null;
  title?: string;
  workflow?: string | null;
  folder?: string;
  sceneFolder?: string;
};

export const makeFile = (path: string, parentPath: string): TFile =>
  new (TFile as unknown as new (
    path: string,
    parentPath: string
  ) => TFile)(path, parentPath);

export function makeProject(options: ProjectOptions) {
  const title = options.title ?? "My Book";
  const folder = options.folder ?? "Novels/My Book";
  const indexPath = `${folder}/${title}.md`;
  const sceneFolder = options.sceneFolder ?? "Scenes";
  const tag = options.tag ?? "timeframe";

  const files = new Map<
    string,
    { file: TFile; frontmatter: Record<string, unknown> }
  >();
  files.set(indexPath, { file: makeFile(indexPath, folder), frontmatter: {} });

  for (const scene of options.scenes) {
    const path = `${folder}/${sceneFolder}/${scene.name}.md`;
    const frontmatter: Record<string, unknown> = {};
    if (scene.value !== undefined) {
      frontmatter[tag] = scene.value;
    }
    files.set(path, {
      file: makeFile(path, `${folder}/${sceneFolder}`),
      frontmatter,
    });
  }

  const output = new Map<string, string>();
  const writes: string[] = [];

  const app = {
    vault: {
      getAbstractFileByPath: (path: string): TFile | null =>
        files.get(path)?.file ?? null,
      adapter: {
        exists: async (path: string): Promise<boolean> => output.has(path),
        read: async (path: string): Promise<string> => output.get(path) ?? "",
        write: async (path: string, contents: string): Promise<void> => {
          writes.push(path);
          output.set(path, contents);
        },
      },
      createFolder: async (): Promise<void> => undefined,
    },
    metadataCache: {
      getFileCache: (
        file: TFile
      ): { frontmatter?: Record<string, unknown> } =>
        files.get(file.path)?.frontmatter
          ? { frontmatter: files.get(file.path)!.frontmatter }
          : {},
    },
  };

  const draft: MultipleSceneDraft = {
    format: "scenes",
    title,
    titleInFrontmatter: true,
    draftTitle: null,
    vaultPath: indexPath,
    workflow: options.workflow === undefined ? "standard" : options.workflow,
    sceneFolder,
    scenes: options.scenes.map((scene) => ({
      title: scene.name,
      indent: scene.indent ?? 0,
    })),
    ignoredFiles: [],
    unknownFiles: [],
    sceneTemplate: null,
    timeframeTagName: tag,
    timeFormat: isTimeframeFormat(options.format)
      ? options.format
      : "datetime",
  };

  const target = options.target === undefined ? "manuscript.md" : options.target;
  workflows.set({
    standard: {
      name: "standard",
      description: "",
      steps:
        target === null
          ? []
          : [
              {
                id: "write-to-note",
                description: { canonicalID: "write-to-note" },
                optionValues: { target },
              },
            ],
    },
  } as any);

  return {
    app: app as never,
    draft,
    output,
    writes,
    files,
    indexPath,
    folder,
    sceneFolder,
    title,
  };
}

export async function runProject(options: ProjectOptions) {
  const project = makeProject(options);
  const result = await buildTimeline(project.app, project.draft);
  await writeTimeline(project.app, project.draft, result);
  const [entry] = [...project.output.entries()];
  return {
    ...project,
    result,
    path: entry?.[0],
    contents: entry?.[1] ?? "",
  };
}

export function rows(contents: string): string[] {
  const lines = contents.split("\n");
  const header = lines.indexOf("| --- | --- |");
  if (header < 0) {
    return [];
  }
  const result: string[] = [];
  for (let i = header + 1; i < lines.length && lines[i].startsWith("| "); i++) {
    result.push(lines[i]);
  }
  return result;
}

export function dataBlock(contents: string): unknown {
  const match = contents.match(/```json\n([\s\S]*?)\n```/);
  return match ? JSON.parse(match[1]) : null;
}

export function mermaidBlock(contents: string): string[] {
  const match = contents.match(/```mermaid\n([\s\S]*?)\n```/);
  return match ? match[1].split("\n") : [];
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
