import { ExtensionContext, OutputChannel, window } from 'vscode';

import { maybeCopyFileToLpar } from '../utils/copy.file';
import { getLpar } from '../utils/settings';
import { getActiveDocument, getRemoteFile } from './copy.utils';

export const createCopyToLparCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // get some configs
  const lpar$ = getLpar();
  const uri$ = getActiveDocument();
  // locate the file
  const file$ = Promise.all([uri$, lpar$]).then(([uri, lpar]) =>
    getRemoteFile(uri, lpar, channel, context)
  );
  // copy
  return Promise.all([uri$, file$, lpar$])
    .then(([uri, file, lpar]) => maybeCopyFileToLpar(uri, file, lpar, channel))
    .then((dstFile) =>
      dstFile
        ? window.showInformationMessage(`Successfully updated ${dstFile}.`)
        : window.showWarningMessage(`Nothing copied.`)
    );
};
