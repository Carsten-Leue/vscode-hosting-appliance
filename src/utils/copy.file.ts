import { parse } from 'path';
import { ignoreElements, endWith } from 'rxjs/operators';
import { OutputChannel, Uri, window } from 'vscode';

import { rxSpawn } from './shell';

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
  const copy$ = rxSpawn('scp', ['-q', base, dst], { cwd: dir })
    .pipe(ignoreElements(), endWith(aDstFile))
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
