import {
  commands,
  ExtensionContext,
  OutputChannel,
  window,
  workspace,
} from 'vscode';

import { getLpar } from '../utils/settings';
import { getActiveDocument, syncLocal } from './copy.utils';

const CMD_OPEN = 'Open ...';

export const createSyncWithVEnvCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => async () => {
  // get some configs
  const [lpar, uri] = await Promise.all([getLpar(), getActiveDocument()]);
  // copy
  const dstUri = await syncLocal(uri, lpar, channel, context);
  // show success and option to select a file
  if (dstUri) {
    // show success
    const cmd = await window.showInformationMessage(
      `Successfully updated [${workspace.asRelativePath(dstUri)}].`,
      CMD_OPEN
    );
    // open document
    if (cmd === CMD_OPEN) {
      await commands.executeCommand('vscode.open', dstUri, { preview: false });
    }
  } else {
    // nothing
    await window.showWarningMessage(`Nothing updated.`);
  }
};
