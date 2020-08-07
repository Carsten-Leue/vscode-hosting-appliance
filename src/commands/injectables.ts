import { ExtensionContext, OutputChannel, Uri, workspace } from 'vscode';

import { Injectable } from '../utils/analysis';
import { selectInjectable } from '../utils/injectables';
import { insertImport } from '../utils/insert.import';
import { getPythonExecutable } from '../utils/python.utils';
import { getActiveDocument } from './copy.utils';

export const createInjectablesCommand = (
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

  // update
  await insertImport(selected.pkg, selected.name);
};
