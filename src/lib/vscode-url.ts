import path from "path";

/**
 * Desktop VS Code registers vscode:// — browser navigation opens the folder locally.
 * @see https://stackoverflow.com/questions/67491505/what-options-are-available-to-use-with-the-vscode-url-scheme
 */
export function vscodeOpenFolderUrl(fsPath: string): string {
  const folder = path.resolve(fsPath);
  const withSlash = folder.endsWith(path.sep) ? folder : folder + path.sep;

  if (process.platform === "win32") {
    const posix = withSlash.replace(/\\/g, "/");
    const m = posix.match(/^([A-Za-z]):(\/.*)$/);
    if (m) {
      return `vscode://file/${m[1].toLowerCase()}:${encodeURI(m[2])}`;
    }
    return `vscode://file/${encodeURI(posix)}`;
  }

  return `vscode://file${encodeURI(withSlash)}`;
}
