import { parse } from 'path';
import { mergeMap, shareReplay } from 'rxjs/operators';
import {
  ExtensionContext,
  OutputChannel,
  Uri,
  window,
  workspace
} from 'vscode';
import { createFileLogger } from '../utils/channels';
import { writeFiles } from '../utils/file';
import { generatePackage } from '../utils/generate.package';
import { getPythonExecutableV2 } from '../utils/python.utils';
import { findRootDir } from '../utils/root.dir';
import { getActiveDocument } from './copy.utils';


function getParentFolder(): Uri | undefined {
  // the current editor
  const editor = window.activeTextEditor;
  if (editor) {
    // file
    const fileUri = editor.document.uri;
    const { dir } = parse(fileUri.fsPath);
    // returns the directory
    return Uri.file(dir);
  }
  // nothing
  return undefined;
}

export const createPackageCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => async () => {
  // current document
  const activeDocUri: Uri = await getActiveDocument();

  const wsFolder = workspace.getWorkspaceFolder(activeDocUri);
  if (!wsFolder) {
    return Promise.reject(
      `Unable to get the workspace folder for ${activeDocUri}`
    );
  }

  // locate python executable
  const pythonExec: Uri = await getPythonExecutableV2(wsFolder.uri);
  channel.appendLine(`Python Executable [${pythonExec}]`);
  // current document
  const defaultUri = getParentFolder();
  // pick the target folder
  const selected = await window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: 'Parent Folder',
    defaultUri,
  });
  if (selected && selected.length === 1 && defaultUri) {
    // target folder
    const dstFolder = selected[0].fsPath;
    // ask for the filename
    const packageName = await window.showInputBox({
      prompt: `New Package Name in [${dstFolder}]`,
    });
    if (packageName) {
      // root
      const rootDir$ = findRootDir(defaultUri.fsPath).pipe(shareReplay());
      // construct the new files
      const written$ = rootDir$.pipe(
        mergeMap((rootDir) =>
          generatePackage(
            pythonExec.fsPath,
            rootDir,
            dstFolder,
            packageName
          ).pipe(writeFiles(rootDir), createFileLogger(channel))
        )
      );
      // done
      return written$.toPromise();
    }
  }
};
