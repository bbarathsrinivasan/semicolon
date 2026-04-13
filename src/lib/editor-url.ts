import path from "path";

export type EditorKind = "vscode" | "cursor" | "custom";

type EditorUrlOptions = {
  editor: EditorKind;
  folderPath: string;
  customTemplate?: string | null;
};

function normalizeFolderPath(fsPath: string): string {
  const folder = path.resolve(fsPath);
  return folder.endsWith(path.sep) ? folder : folder + path.sep;
}

function toSchemePath(folderWithSlash: string): string {
  if (process.platform === "win32") {
    const posix = folderWithSlash.replace(/\\/g, "/");
    const m = posix.match(/^([A-Za-z]):(\/.*)$/);
    if (m) {
      return `${m[1].toLowerCase()}:${m[2]}`;
    }
    return posix;
  }
  return folderWithSlash;
}

export function vscodeOpenFolderUrl(fsPath: string): string {
  const withSlash = normalizeFolderPath(fsPath);
  return `vscode://file/${encodeURI(toSchemePath(withSlash))}`;
}

export function cursorOpenFolderUrl(fsPath: string): string {
  const withSlash = normalizeFolderPath(fsPath);
  return `cursor://file/${encodeURI(toSchemePath(withSlash))}`;
}

export function customEditorOpenFolderUrl(
  fsPath: string,
  template: string
): string | null {
  const raw = template.trim();
  if (!raw) return null;
  const withSlash = normalizeFolderPath(fsPath);
  const schemePath = toSchemePath(withSlash);
  const encoded = encodeURI(schemePath);

  const hasPathToken =
    raw.includes("{{path}}") ||
    raw.includes("{path}") ||
    raw.includes("{{encodedPath}}") ||
    raw.includes("{encodedPath}");

  if (!hasPathToken) return null;

  return raw
    .replaceAll("{{path}}", schemePath)
    .replaceAll("{path}", schemePath)
    .replaceAll("{{encodedPath}}", encoded)
    .replaceAll("{encodedPath}", encoded);
}

export function buildEditorOpenFolderUrl({
  editor,
  folderPath,
  customTemplate,
}: EditorUrlOptions): string | null {
  if (editor === "vscode") return vscodeOpenFolderUrl(folderPath);
  if (editor === "cursor") return cursorOpenFolderUrl(folderPath);
  return customEditorOpenFolderUrl(folderPath, customTemplate ?? "");
}
