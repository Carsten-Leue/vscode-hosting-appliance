import { parse } from 'path';
import { reduce } from 'rxjs/operators';
import {
  ExtensionContext,
  OutputChannel,
  Uri,
  window,
  workspace,
} from 'vscode';

import { findFile } from '../utils/find.file';

function getKey(aLpar: string, aRelName: string): string {
  return `[${aLpar}]:${aRelName}`;
}

/**
 * Returns the URI of the currently open document
 *
 * @returns the uri of the document
 */
export function getActiveDocument(): Thenable<Uri> {
  // the current editor
  const editor = window.activeTextEditor;
  if (editor) {
    return Promise.resolve(editor.document.uri);
  }
  // fails opening the document
  return Promise.reject(new Error('No open document.'));
}

export function resetMapping(
  aFileName: Uri,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // locate the workspace
  const relPath = workspace.asRelativePath(aFileName);
  // cache key
  const key = getKey(aLpar, relPath);
  // check for the existence of a cached file
  const memento = aContext.workspaceState;
  // log this
  aChannel.appendLine(`Removing ${relPath} from cache.`);
  // done
  memento.update(key, undefined);
}

/**
 * Returns a mapping from a local URI to a remote file, potentially from a memento
 *
 * @param aFileName    - the file URI
 * @param aLpar - the LPAR name
 * @param aChannel - the debug channel
 * @param aContext - the extension context for caching
 *
 * @returns the selected file
 */
export function getRemoteFile(
  aFileName: Uri,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<string | undefined> {
  // locate the workspace
  const relPath = workspace.asRelativePath(aFileName);
  // cache key
  const key = getKey(aLpar, relPath);
  // check for the existence of a cached file
  const memento = aContext.workspaceState;
  const cachedResult = memento.get<string>(key);
  if (cachedResult) {
    // log this
    aChannel.appendLine(`Reading ${relPath} -> ${cachedResult} from cache.`);
    // return the cached version
    return Promise.resolve(cachedResult);
  }
  // locate the files
  const { base } = parse(relPath);
  // resulting files
  const file$ = findFile(base, aLpar)
    .pipe(reduce((res: string[], item) => [...res, item], []))
    .toPromise();
  // update
  const selected$ = window.showQuickPick(file$);
  // if selected update the memento
  return selected$.then((selectedResult) => {
    // in case there exists a selection, update it
    if (selectedResult) {
      // log this
      aChannel.appendLine(
        `Updating ${relPath} -> ${selectedResult} from user selection.`
      );
      return memento.update(key, selectedResult).then(() => selectedResult);
    }
    // return the value
    return selectedResult;
  });
}

export function selectRemoteFile(aName: string, aLpar: string) {
  // resulting files
  const file$ = findFile(aName, aLpar)
    .pipe(reduce((res: string[], item) => [...res, item], []))
    .toPromise();
  return window.showQuickPick(file$);
}
