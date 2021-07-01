import { isAbsolute } from 'path';
import { commands, Uri, workspace } from 'vscode';

function openPythonSettings(): Thenable<unknown> {
  return commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:ms-python.python`
  );
}

function resolvePath(aScope: Uri, aPath: string): Uri {
  // get the root directory from the python path
  return isAbsolute(aPath) ? Uri.file(aPath) : Uri.joinPath(aScope, aPath);
}

export function getPythonExecutable(aScope: Uri): Uri {
  // run a command
  // locate the virtual environment root
  const config = workspace.getConfiguration('python', aScope);
  // access
  const path =
    config.get<string | undefined>('pythonPath') ||
    config.get<string | undefined>('defaultInterpreterPath');
  if (!path) {
    openPythonSettings();
    throw new Error('Python path not configured.');
  }
  // get the root directory from the python path
  return resolvePath(aScope, path);
}

export function getPythonExecutableV2(aScope: Uri): Thenable<Uri> {
  // run a command
  const executable$ = commands.executeCommand<string | undefined>(
    'python.interpreterPath'
  );
  // resolve the executable
  return executable$.then(
    (path) => (path ? resolvePath(aScope, path) : getPythonExecutable(aScope)),
    () => getPythonExecutable(aScope)
  );
}
