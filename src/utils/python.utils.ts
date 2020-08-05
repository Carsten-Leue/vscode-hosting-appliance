import { isAbsolute } from 'path';
import { commands, Uri, workspace } from 'vscode';

function openPythonSettings() {
  return commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:ms-python.python`
  );
}

export function getPythonExecutable(aScope: Uri) {
  // locate the virtual environment root
  const config = workspace.getConfiguration('python', aScope);
  // access
  const path = config.get<string | undefined>('pythonPath');
  if (!path) {
    openPythonSettings();
    throw new Error('Python path not configured.');
  }
  // get the root directory from the python path
  return isAbsolute(path) ? Uri.file(path) : Uri.joinPath(aScope, path);
}
