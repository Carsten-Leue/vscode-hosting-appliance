import { isAbsolute, parse } from "path";
import { reduce } from "rxjs/operators";
import {
  commands,
  ExtensionContext,
  Memento,
  OutputChannel,
  QuickPickItem,
  RelativePattern,
  Uri,
  window,
  workspace,
} from "vscode";

import { copyLocalFile, makeDir } from "../utils/copy.file";
import { findFile } from "../utils/find.file";
import { timing } from "../utils/timer";
import { getVirtualEnvironmentDir } from "./venv.utils";

const SEED = 4;

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
  return `${SEED}:local:${aRemote}:[${aLpar}]`;
}

/**
 * Returns the key for the inverse mapping from remote to venv file
 *
 * @param aLpar  - the name of the LPAR
 * @param aRemote - the remote file
 *
 * @returns the key
 */
function getRemoteToVEnvKey(aLpar: string, aRemote: string): string {
  return `${SEED}:venv:${aRemote}:[${aLpar}]`;
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
  return Promise.reject(new Error("No open document."));
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
  const selected$ = window.showQuickPick(file$, { placeHolder: "Remote File" });
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
      // map the remote key to either the local or the virtual environment
      const local$ = venv$.then((venv) =>
        updateRemoteToLocal(
          memento,
          venv
            ? getRemoteToVEnvKey(aLpar, selectedResult)
            : getRemoteToLocalKey(aLpar, selectedResult),
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
  return window.showQuickPick(file$, { placeHolder: "Remote File" });
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

const DIST_PACKAGES = "/dist-packages/";

function openPythonSettings() {
  return commands.executeCommand(
    "workbench.action.openSettings",
    `@ext:ms-python.python`
  );
}

async function guessVirtualEnvironmentFiles(
  aRemote: string,
  aScope: Uri,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // split the remote path
  const idx = aRemote.indexOf(DIST_PACKAGES);
  if (idx < 0) {
    throw new Error(
      `Unable to locate the [${DIST_PACKAGES}] segment in [${aRemote}].`
    );
  }
  // suffix
  const suffix = aRemote.substr(idx + DIST_PACKAGES.length);
  // locate the virtual environment root
  const config = workspace.getConfiguration("python", aScope);
  // access
  const path = config.get<string | undefined>("pythonPath");
  if (!path) {
    await openPythonSettings();
    throw new Error("Python path not configured.");
  }
  // get the root directory from the python path
  const pythonUri = isAbsolute(path)
    ? Uri.file(path)
    : Uri.joinPath(aScope, path);
  const venv = await getVirtualEnvironmentDir(pythonUri, aChannel, aContext);
  // bail out if we could not find the environment
  if (!venv) {
    throw new Error(`Unable to locate the virtual environment from [${path}].`);
  }
  // append
  const venvUri = Uri.file(venv);
  const localUri = Uri.joinPath(venvUri, suffix);
  // returns the list
  return [localUri];
}

function getLocalFileName(
  aSrc: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext,
  aVirtual: boolean
): Thenable<Uri> {
  // try to locate the file in the workspace
  const wsFolder = workspace.getWorkspaceFolder(aSrc);
  if (!wsFolder) {
    return Promise.reject(`Unable to get the workspace folder for ${aSrc}`);
  }
  // the memento
  const memento = aContext.workspaceState;
  // check if we can find a local file
  const key = aVirtual
    ? getRemoteToVEnvKey(aLpar, aRemote)
    : getRemoteToLocalKey(aLpar, aRemote);
  const cachedLocal = memento.get<string>(key);
  if (cachedLocal) {
    // log this
    aChannel.appendLine(`Returning local file ${cachedLocal} for ${aRemote}`);
    // returns the file
    return Promise.resolve(Uri.joinPath(wsFolder.uri, cachedLocal));
  }
  // locate the file in the workspace
  const { base } = parse(aSrc.fsPath);
  const files$ = workspace.findFiles(
    new RelativePattern(wsFolder, `**/${base}`)
  );
  // local files
  const localFiles$ = files$
    .then((result) =>
      Promise.all(
        result.map((uri) =>
          getVirtualEnvironmentDir(uri, aChannel, aContext).then((dir) =>
            (dir && aVirtual) || (!dir && !aVirtual) ? uri : undefined
          )
        )
      )
    )
    .then((result) => result.filter(Boolean))
    .then((result) =>
      result.length === 0 && aVirtual
        ? guessVirtualEnvironmentFiles(
            aRemote,
            wsFolder.uri,
            aChannel,
            aContext
          )
        : result
    )
    .then((result) => result.map((uri) => createQuickPickFile(uri!)));
  // update
  const selected$ = window.showQuickPick(localFiles$, {
    placeHolder: "Local File",
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
      const local$ = updateRemoteToLocal(memento, key, relPath);
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
    return Promise.reject("Please select a local file.");
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

function copyUriToUriDir(
  aSrc: Uri,
  aDst: Uri,
  aChannel: OutputChannel
): Thenable<Uri> {
  // get the target root
  const { dir } = parse(aDst.fsPath);
  // make dire
  return makeDir(dir).then(() => copyUriToUri(aSrc, aDst, aChannel));
}

async function updateLocalFromVirtual(
  aVirtual: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // log this
  aChannel.appendLine(`updateLocalFromVirtual ${aVirtual} ${aRemote} ...`);
  // get the local filename to update
  const dstUri = await getLocalFileName(
    aVirtual,
    aRemote,
    aLpar,
    aChannel,
    aContext,
    false
  );
  // execute the copy
  const copy$ = copyUriToUri(aVirtual, dstUri, aChannel);
  // show in the status bar
  window.setStatusBarMessage(`Updating local file from ${aVirtual} ...`, copy$);
  // some timing
  return timing(aChannel, "updateLocalFromVirtual", copy$);
}

async function updateVirtualFromLocal(
  aLocal: Uri,
  aRemote: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // log this
  aChannel.appendLine(`updateVirtualFromLocal ${aLocal} ${aRemote} ...`);
  // get the local filename to update
  const dstUri = await getLocalFileName(
    aLocal,
    aRemote,
    aLpar,
    aChannel,
    aContext,
    true
  );
  // execute the copy
  const copy$ = copyUriToUriDir(aLocal, dstUri, aChannel);
  // show in the status bar
  window.setStatusBarMessage(
    `Updating virtual environment file from ${aLocal} ...`,
    copy$
  );
  // some timing
  return timing(aChannel, "updateVirtualFromLocal", copy$);
}

/**
 * Returns the name of a local file to sync to
 *
 * @param aFileName - the file URI
 * @param aLpar - the LPAR name
 * @param aChannel - the debug channel
 * @param aContext - the extension context for caching
 */
export async function syncLocal(
  aFileName: Uri,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
) {
  // test if the file is in a virtual environment
  const venv$ = getVirtualEnvironmentDir(aFileName, aChannel, aContext);
  // locate the matching remote file
  const remote = await getRemoteFile(aFileName, aLpar, aChannel, aContext);
  if (!remote) {
    throw new Error("Please select a remote file.");
  }
  // the result
  const result$ = (await venv$)
    ? updateLocalFromVirtual(aFileName, remote, aLpar, aChannel, aContext)
    : updateVirtualFromLocal(aFileName, remote, aLpar, aChannel, aContext);
  // some timing
  return timing(aChannel, "syncLocal", result$);
}
