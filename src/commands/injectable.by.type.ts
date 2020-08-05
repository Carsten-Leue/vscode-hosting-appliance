import {
  window,
  ExtensionContext,
  OutputChannel,
  Uri,
  workspace,
  SnippetString,
} from 'vscode';
import { getActiveDocument } from './copy.utils';
import { getPythonExecutable } from '../utils/python.utils';
import { selectInjectable } from '../utils/injectables';

export const createInjectablesByTypeCommand = (
  channel: OutputChannel,
  context: ExtensionContext
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
  channel.appendLine(`Python Executable [${pythonExec}]`);

  const selected = await selectInjectable(pythonExec.fsPath);
  channel.appendLine(`Selected Injectable [${selected}]`);

  const editor = window.activeTextEditor;
  if (editor) {
    const [name, module] = selected;
    await editor.insertSnippet(
      new SnippetString(`from ${module} import ${name}`)
    );
  }
};
