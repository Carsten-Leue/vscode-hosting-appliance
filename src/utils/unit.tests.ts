import { parse } from 'path';
import { endWith, ignoreElements } from 'rxjs/operators';
import { ExtensionContext, OutputChannel, Uri, window } from 'vscode';

import { getOutputChannel } from './channels';
import { createLogger } from './logger';
import { rxSpawn } from './shell';

export function runTest(
  aSrcFile: Uri,
  aDstFile: string,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<string> {
  // base
  const { base } = parse(aSrcFile.fsPath);
  // open a console
  const channel = getOutputChannel(base);
  channel.show(true);
  // remove command
  const command = `pytest "${aDstFile}"`;
  // log statement
  const log = `Executing test command [${command}] ...`;
  // log this
  aChannel.appendLine(log);
  // execute the command
  const exec$ = rxSpawn('ssh', [aLpar, command])
    .pipe(createLogger(channel), ignoreElements(), endWith(aDstFile))
    .toPromise();
  // set status bar text
  window.setStatusBarMessage(log, exec$);
  // done
  return exec$;
}

export function maybeRunTest(
  aSrcFile: Uri,
  aDstFile: string | undefined,
  aLpar: string,
  aChannel: OutputChannel,
  aContext: ExtensionContext
): Thenable<string | undefined> {
  // sanity check
  if (aDstFile) {
    return runTest(aSrcFile, aDstFile, aLpar, aChannel, aContext);
  }
  // nothing
  return Promise.resolve(aDstFile);
}
