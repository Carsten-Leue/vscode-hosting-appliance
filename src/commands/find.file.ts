import { parse } from 'path';
import { ExtensionContext, OutputChannel, window, workspace } from 'vscode';

import { getLpar } from '../utils/settings';
import { selectRemoteFile } from './copy.utils';

export const createFindFilesCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // get the lpar
  return getLpar().then((lpar) => {
    const editor = window.activeTextEditor;
    if (editor && editor.document) {
      const { base } = parse(editor.document.uri.fsPath);
      // resulting files
      return selectRemoteFile(base, lpar);
    }
  });
};
