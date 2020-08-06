import { ExtensionContext, OutputChannel, SnippetString, Uri, window, workspace } from 'vscode';

import { Injectable } from '../utils/analysis';
import { selectInjectable } from '../utils/injectables';
import { getPythonExecutable } from '../utils/python.utils';
import { getActiveDocument } from './copy.utils';

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

  const selected: Injectable = await selectInjectable(pythonExec.fsPath);
  channel.appendLine(`Selected Injectable [${selected}]`);

  const editor = window.activeTextEditor;
  if (editor) {
    const { name, pkg } = selected;
    await editor.insertSnippet(new SnippetString(`from ${pkg} import ${name}`));
  }
};
