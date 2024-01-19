import { drafts, selectedDraft } from "src/model/stores";
import type { MultipleSceneDraft } from "src/model/types";
import { get } from "svelte/store";


const getSelectedDraftWithIndex = () => {
    const draft = get(selectedDraft) as MultipleSceneDraft;
    if (!draft) {
        return { index: -1, draft }
    }
    const index = get(drafts).findIndex(
        (d) => d.vaultPath === draft.vaultPath
    );
    return { index, draft }
}

export const addScene = (fileName: string) => {
    const { index, draft } = getSelectedDraftWithIndex()
    if (!draft) {
        return;
    }
    if (index >= 0 && draft.format === "scenes") {
        drafts.update((d) => {
            const targetDraft = d[index] as MultipleSceneDraft;
            (d[index] as MultipleSceneDraft).scenes = [
                ...targetDraft.scenes,
                { title: fileName, indent: 0 },
            ];
            (d[index] as MultipleSceneDraft).unknownFiles =
                targetDraft.unknownFiles.filter((f) => f !== fileName);
            return d;
        });
    }
}

export const ignoreScene = (fileName: string) => {
    const { index, draft } = getSelectedDraftWithIndex()
    if (!draft) {
        return;
    }
    if (index >= 0 && draft.format === "scenes") {
        drafts.update((d) => {
            const targetDraft = d[index] as MultipleSceneDraft;
            (d[index] as MultipleSceneDraft).scenes = targetDraft.scenes.filter(it => it.title != fileName);
            (d[index] as MultipleSceneDraft).ignoredFiles = [
                ...targetDraft.ignoredFiles,
                fileName,
            ];
            (d[index] as MultipleSceneDraft).unknownFiles =
                targetDraft.unknownFiles.filter((f) => f !== fileName);
            return d;
        });
    }
}

export const addAll = () => {
    const { index, draft } = getSelectedDraftWithIndex()
    if (!draft) {
        return;
    }
    if (index >= 0 && draft.format === "scenes") {
        drafts.update((d) => {
            const targetDraft = d[index] as MultipleSceneDraft;
            (d[index] as MultipleSceneDraft).scenes = [
                ...targetDraft.scenes,
                ...targetDraft.unknownFiles.map((f) => ({ title: f, indent: 0 })),
            ];
            (d[index] as MultipleSceneDraft).unknownFiles = [];
            return d;
        });
    }
}

export const ignoreAll = () => {
    const { index, draft } = getSelectedDraftWithIndex()
    if (!draft) {
        return;
    }
    if (index >= 0 && draft.format === "scenes") {
        drafts.update((d) => {
            const targetDraft = d[index] as MultipleSceneDraft;
            (d[index] as MultipleSceneDraft).ignoredFiles = [
                ...targetDraft.ignoredFiles,
                ...targetDraft.unknownFiles,
            ];
            (d[index] as MultipleSceneDraft).unknownFiles = [];
            return d;
        });
    }
}
