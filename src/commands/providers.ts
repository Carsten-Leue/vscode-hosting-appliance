import { ExtensionContext, OutputChannel, Uri, workspace } from 'vscode';

import { insertImport } from '../utils/insert.import';
import { Provider, selectProvider } from '../utils/providers';
import { getPythonExecutableV2 } from '../utils/python.utils';
import { getActiveDocument } from './copy.utils';

export const createProvidersCommand = (
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
  const pythonExec: Uri = await getPythonExecutableV2(wsFolder.uri);
  channel.appendLine(`Python Executable [${pythonExec}]`);

  const selected: Provider = await selectProvider(pythonExec.fsPath);
  channel.appendLine(`Selected Provider [${selected}]`);

  // update
  await insertImport(selected.pkg, selected.name);
};
