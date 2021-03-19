import { PathLike, stat, Stats } from 'fs';
import { join } from 'path';
import { bindNodeCallback, combineLatest, Observable, of } from 'rxjs';
import { catchError, ignoreElements, map, mergeMap } from 'rxjs/operators';
import {
  ExtensionContext,
  OutputChannel,
  ProgressLocation,
  Uri,
  window,
  workspace,
} from 'vscode';
import { createLogger, createProgress } from '../utils/logger';
import { getPythonExecutable } from '../utils/python.utils';
import { rxSpawn, SpawnLine } from '../utils/shell';
import { getActiveDocument } from './copy.utils';

const rxStat = bindNodeCallback<PathLike, Stats>(stat);

const hasFile = (path: PathLike): Observable<boolean> =>
  rxStat(path).pipe(
    map((stats) => stats.isFile()),
    catchError(() => of(false))
  );

/**
 * Updates the virtual environment
 *
 * @param aPython - name of the python exectuable
 * @param aRootFolder - name of the root folder
 *
 * @returns the analysis
 */
function internalUpdateVirtualEnvironment(
  aPython: string,
  aRootFolder: string
): Observable<SpawnLine> {
  // build the data
  const requirements = join(aRootFolder, 'requirements.txt');
  const testRequirements = join(aRootFolder, 'test-requirements.txt');

  const requirements$ = hasFile(requirements).pipe(
    map((flag) => (flag ? ['-r', requirements] : []))
  );
  const testRequirements$ = hasFile(testRequirements).pipe(
    map((flag) => (flag ? ['-r', testRequirements] : []))
  );

  const arguments$ = combineLatest([requirements$, testRequirements$]).pipe(
    map(([req, testReq]) => [
      '-m',
      'pip',
      'install',
      'pip',
      ...req,
      ...testReq,
      '--upgrade',
    ])
  );

  // dispatch
  return arguments$.pipe(mergeMap((args) => rxSpawn(aPython, args)));
}

export const createUpdateVEnvCommand = (
  aChannel: OutputChannel,
  aContext: ExtensionContext
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
  const pythonExec: Uri = getPythonExecutable(wsFolder.uri);
  aChannel.appendLine(`Python Executable [${pythonExec}]`);

  // show a message
  window.showInformationMessage(
    `Updating virtual environment [${pythonExec.fsPath}] ...`
  );

  await window.withProgress(
    {
      location: ProgressLocation.Window,
    },
    (progress) =>
      internalUpdateVirtualEnvironment(pythonExec.fsPath, wsFolder.uri.fsPath)
        .pipe(
          createLogger(aChannel, true),
          createProgress(progress, false, false),
          ignoreElements()
        )
        .toPromise()
  );

  // show a message
  window.showInformationMessage(`Updating virtual environment done.`);
};
