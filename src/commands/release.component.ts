import { concat, Observable, UnaryFunction } from 'rxjs';
import { ignoreElements, map } from 'rxjs/operators';
import {
  ExtensionContext,
  OutputChannel,
  ProgressLocation,
  Uri,
  window,
  workspace
} from 'vscode';
import { createLogger, createProgress } from '../utils/logger';
import { getPythonExecutable } from '../utils/python.utils';
import { rxSpawn, SpawnLine, SPAWN_OUTPUT_TYPE } from '../utils/shell';
import { getActiveDocument } from './copy.utils';

/**
 * Releases a component by first doing a bumpversion, then git push and git push tags
 *
 * @param aPython - name of the python exectuable
 * @param aRootFolder - name of the root folder
 *
 * @returns the analysis
 */
function internalReleaseComponent(
  aPython: string,
  aRootFolder: string
): Observable<SpawnLine> {
  // bump version
  const bumpVersion$ = rxSpawn(aPython, ['-m', 'bumpversion', 'patch'], {
    cwd: aRootFolder,
  });
  // git push
  const gitPush$ = rxSpawn('git', ['push'], { cwd: aRootFolder });
  // git push tags
  const gitPushTags$ = rxSpawn('git', ['push', '--tags'], { cwd: aRootFolder });

  // chain
  const all$ = concat(bumpVersion$, gitPush$, gitPushTags$);

  return all$;
}

export const createReleaseComponentCommand = (
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
    `Releasing component [${wsFolder.uri.fsPath}] ...`
  );

  const toStdout: UnaryFunction<SpawnLine, SpawnLine> = ([
    ,
    line,
  ]: SpawnLine): SpawnLine => [SPAWN_OUTPUT_TYPE.STDOUT, line];

  await window.withProgress(
    {
      location: ProgressLocation.Window,
    },
    (progress) =>
      internalReleaseComponent(pythonExec.fsPath, wsFolder.uri.fsPath)
        .pipe(
          map(toStdout),
          createLogger(aChannel, true),
          createProgress(progress, false, false),
          ignoreElements()
        )
        .toPromise()
  );

  // show a message
  window.showInformationMessage(`Component released.`);
};
