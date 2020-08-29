import { copyFile, MakeDirectoryOptions, mkdir, PathLike } from 'fs';
import { parse } from 'path';
import { bindNodeCallback } from 'rxjs';
import { endWith, ignoreElements } from 'rxjs/operators';
import { OutputChannel, Uri, window } from 'vscode';

import { createLogger } from './logger';
import { rxSpawn } from './shell';

const rxCopyFile = bindNodeCallback(copyFile);
const rxMkDir = bindNodeCallback<PathLike, MakeDirectoryOptions>(mkdir);

/**
 * Recurvisely create the directory
 *
 * @param aDir - target directory
 * @returns the target directory
 */
export function makeDir(aDir: string): Thenable<string> {
  return rxMkDir(aDir, { recursive: true })
    .toPromise()
    .then(() => aDir);
}

/**
 * Copies a file from an existing source location to an existing target location
 *
 * @param aSrc - the source location
 * @param aDst - the target location
 *
 * @returns the target file
 */
export function copyLocalFile(aSrc: string, aDst: string): Thenable<string> {
  return rxCopyFile(aSrc, aDst)
    .toPromise()
    .then(() => aDst);
}

export function copyFileToLpar(
  aSrcFile: Uri,
  aDstFile: string,
  aLpar: string,
  aChannel: OutputChannel
): Thenable<string> {
  // dump
  const log = `Copying ${aSrcFile} -> ${aDstFile} ...`;
  aChannel.appendLine(log);
  // use the directory as the current working directory
  const { base, dir } = parse(aSrcFile.fsPath);
  // target
  const dst = `${aLpar}:${aDstFile}`;
  // use SCP command
  const copy$ = rxSpawn('scp', [base, dst], { cwd: dir })
    .pipe(createLogger(aChannel), ignoreElements(), endWith(aDstFile))
    .toPromise();
  // set status bar text
  window.setStatusBarMessage(log, copy$);
  // done
  return copy$;
}

export function copyFileFromLpar(
  aSrcFile: Uri,
  aDstFile: string,
  aLpar: string,
  aChannel: OutputChannel
): Thenable<string> {
  // dump
  const log = `Copying ${aDstFile} -> ${aSrcFile} ...`;
  aChannel.appendLine(log);
  // use the directory as the current working directory
  const { base, dir } = parse(aSrcFile.fsPath);
  // target
  const dst = `${aLpar}:${aDstFile}`;
  // use SCP command
  const copy$ = rxSpawn('scp', [dst, base], { cwd: dir })
    .pipe(createLogger(aChannel), ignoreElements(), endWith(aDstFile))
    .toPromise();
  // set status bar text
  window.setStatusBarMessage(log, copy$);
  // done
  return copy$;
}

export function maybeCopyFileToLpar(
  aSrcFile: Uri,
  aDstFile: string | undefined,
  aLpar: string,
  aChannel: OutputChannel
): Thenable<string | undefined> {
  // sanity check
  if (aDstFile) {
    return copyFileToLpar(aSrcFile, aDstFile, aLpar, aChannel);
  }
  // nothing
  return Promise.resolve(aDstFile);
}

export function maybeCopyFileFromLpar(
  aSrcFile: Uri,
  aDstFile: string | undefined,
  aLpar: string,
  aChannel: OutputChannel
): Thenable<string | undefined> {
  // sanity check
  if (aDstFile) {
    return copyFileFromLpar(aSrcFile, aDstFile, aLpar, aChannel);
  }
  // nothing
  return Promise.resolve(aDstFile);
}
