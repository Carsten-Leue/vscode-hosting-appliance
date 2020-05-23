import { parse } from 'path';
import { reduce } from 'rxjs/operators';
import {
  ExtensionContext,
  Memento,
  OutputChannel,
  QuickPickItem,
  RelativePattern,
  Uri,
  window,
  workspace,
} from 'vscode';

import { copyLocalFile } from '../utils/copy.file';
import { findFile } from '../utils/find.file';
import { getVirtualEnvironmentDir } from './venv.utils';
import { timing } from '../utils/timer';

const SEED = 2;

/**
 * Returns the key for this mapping of local file to remote file
 *
 * @param aLpar  - name of the LPAR
 * @param aRelName - relative filename
 *
 * @returns the key
 */
function getLocalToRemoteKey(aLpar: string, aRelName: string): string {
  return `${SEED}:[${aLpar}]:${aRelName}`;
}

/**
 * Returns the key for the inverse mapping from remote to local file
 *
 * @param aLpar  - the name of the LPAR
 * @param aRemote - the remote file
 *
 * @returns the key
 */
function getRemoteToLocalKey(aLpar: string, aRemote: string): string {
  return `${SEED}:${aRemote}:[${aLpar}]`;
}

function updateRemoteToLocal(
  aMemento: Memento,
  aKey: string,
  aLocalFile: string
): Thenable<void> {
  return aMemento.update(aKey, aLocalFile);
}

function updateLocalToRemote(
  aMemento: Memento,
  aKey: string,
  aRemoteFile: string
): Thenable<void> {
  return aMemento.update(aKey, aRemoteFile);
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
  const key = getLocalToRemoteKey(aLpar, relPath);
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
 * @param aFileName - the file URI
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
  // check if the file is in a venv
  const venv$ = getVirtualEnvironmentDir(aFileName, aChannel, aContext);
  // locate the workspace
  const relPath = workspace.asRelativePath(aFileName);
  // cache key
  const localKey = getLocalToRemoteKey(aLpar, relPath);
  // check for the existence of a cached file
  const memento = aContext.workspaceState;
  const cachedResult = memento.get<string>(localKey);
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
  const selected$ = window.showQuickPick(file$, { placeHolder: 'Remote File' });
  // if selected update the memento
  return selected$.then((selectedResult) => {
    // in case there exists a selection, update it
    if (selectedResult) {
      // log this
      aChannel.appendLine(
        `Updating ${relPath} -> ${selectedResult} from user selection.`
      );
      // update the mapping from local to remote
      const remote$ = updateLocalToRemote(memento, localKey, selectedResult);
      // only update the mapping from remote to local if the local file is not in a virtual environment
      const local$ = venv$.then((venv) =>
        venv
          ? undefined
          : updateRemoteToLocal(
              memento,
              getRemoteToLocalKey(aLpar, selectedResult),
              relPath
            )
      );
      // continue
      return Promise.all([remote$, local$]).then(() => selectedResult);
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
  return window.showQuickPick(file$, { placeHolder: 'Remote File' });
}

interface QuickPickFile extends QuickPickItem {
  uri: Uri;
  relPath: string;
}

function createQuickPickFile(aUri: Uri): QuickPickFile {
  const relPath = workspace.asRelativePath(aUri);
  return {
    uri: aUri,
    label: relPath,
    relPath,
    detail: aUri.fsPath,
  };
}

function getLocalFileName(
  aVirtual: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<Uri> {
  // try to locate the file in the workspace
  const wsFolder = workspace.getWorkspaceFolder(aVirtual);
  if (!wsFolder) {
    return Promise.reject(`Unable to get the workspace folder for ${aVirtual}`);
  }
  // the memento
  const memento = aContext.workspaceState;
  // check if we can find a local file
  const key = getRemoteToLocalKey(aLpar, aRemote);
  const cachedLocal = memento.get<string>(key);
  if (cachedLocal) {
    // log this
    aChannel.appendLine(`Returning local file ${cachedLocal} for ${aRemote}`);
    // returns the file
    return Promise.resolve(Uri.joinPath(wsFolder.uri, cachedLocal));
  }
  // locate the file in the workspace
  const { base } = parse(aVirtual.fsPath);
  const files$ = workspace.findFiles(
    new RelativePattern(wsFolder, `**/${base}`)
  );
  // local files
  const localFiles$ = files$
    .then((result) =>
      Promise.all(
        result.map((uri) =>
          getVirtualEnvironmentDir(uri, aChannel, aContext).then((dir) =>
            dir ? undefined : uri
          )
        )
      )
    )
    .then((result) => result.filter(Boolean))
    .then((result) => result.map((uri) => createQuickPickFile(uri!)));
  // update
  const selected$ = window.showQuickPick(localFiles$, {
    placeHolder: 'Local File',
  });
  // if selected update the memento
  return selected$.then((selectedResult) => {
    // in case there exists a selection, update it
    if (selectedResult) {
      // selected uri
      const { uri, relPath } = selectedResult;
      // log this
      aChannel.appendLine(
        `Updating ${aRemote} -> ${relPath} from user selection.`
      );
      // update the mapping from local to remote
      const local$ = updateRemoteToLocal(
        memento,
        getRemoteToLocalKey(aLpar, aRemote),
        relPath
      );
      // update the mapping from remote to local
      const remote$ = updateLocalToRemote(
        memento,
        getLocalToRemoteKey(aLpar, relPath),
        aRemote
      );
      // continue
      return Promise.all([local$, remote$]).then(() => uri);
    }
    // return the value
    return Promise.reject('Please select a local file.');
  });
}

function copyUriToUri(
  aSrc: Uri,
  aDst: Uri,
  aChannel: OutputChannel
): Thenable<Uri> {
  // just some logging
  aChannel.appendLine(`Copy ${aSrc} to ${aDst} ...`);
  // perform the actual copy
  return copyLocalFile(aSrc.fsPath, aDst.fsPath).then(() => aDst);
}

function updateLocalFromVirtual(
  aVirtual: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<Uri> {
  // log this
  aChannel.appendLine(`updateLocalFromVirtual ${aVirtual} ${aRemote} ...`);
  // get the local filename to update
  const local$ = getLocalFileName(aVirtual, aRemote, aLpar, aChannel, aContext);
  // execute the copy
  const copy$ = local$.then((dstUri) =>
    copyUriToUri(aVirtual, dstUri, aChannel)
  );
  // show in the status bar
  window.setStatusBarMessage(`Updating local file from ${aVirtual} ...`, copy$);
  // some timing
  return timing(aChannel, 'updateLocalFromVirtual', copy$);
}

function updateVirtualFromLocal(
  aLocal: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<Uri> {
  return Promise.reject(new Error('TODO not implemented, yet'));
}

/**
 * Returns the name of a local file to sync to
 *
 * @param aFileName - the file URI
 * @param aLpar - the LPAR name
 * @param aChannel - the debug channel
 * @param aContext - the extension context for caching
 */
export function syncLocal(
  aFileName: Uri,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // test if the file is in a virtual environment
  const venv$ = getVirtualEnvironmentDir(aFileName, aChannel, aContext);
  // locate the matching remote file
  const remote$: Thenable<string> = getRemoteFile(
    aFileName,
    aLpar,
    aChannel,
    aContext
  ).then((result) =>
    result ? result : Promise.reject('Please select a remote file.')
  );
  // check what direction to update
  const result$ = Promise.all<string | undefined, string>([
    venv$,
    remote$,
  ]).then(([venv, remote]) =>
    venv
      ? updateLocalFromVirtual(aFileName, remote, aLpar, aChannel, aContext)
      : updateVirtualFromLocal(aFileName, remote, aLpar, aChannel, aContext)
  );
  // some timing
  return timing(aChannel, 'syncLocal', result$);
}
