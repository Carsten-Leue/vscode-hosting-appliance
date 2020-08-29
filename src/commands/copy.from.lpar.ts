import { ExtensionContext, OutputChannel, window } from 'vscode';

import { maybeCopyFileFromLpar } from '../utils/copy.file';
import { getLpar } from '../utils/settings';
import { getActiveDocument, getRemoteFile } from './copy.utils';

export const createCopyFromLparCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => async () => {
  // get some configs
  const [lpar, uri] = await Promise.all([getLpar(), getActiveDocument()]);
  // locate the file
  const file = await getRemoteFile(uri, lpar, channel, context);
  // target file
  const dstUri = await maybeCopyFileFromLpar(uri, file, lpar, channel);
  // handle message
  if (dstUri) {
    await window.showInformationMessage(`Successfully updated [${dstUri}].`);
  } else {
    await window.showWarningMessage(`Nothing copied.`);
  }
};
