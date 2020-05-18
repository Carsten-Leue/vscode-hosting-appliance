import { parse } from 'path';
import { reduce } from 'rxjs/operators';
import { ExtensionContext, OutputChannel, window, workspace } from 'vscode';

import { findFile } from '../utils/find.file';
import { openSettings } from '../utils/settings';

export function createFindFilesCommand(
  channel: OutputChannel,
  context: ExtensionContext
) {
  return () => {
    // access our config
    const { lpar } = workspace.getConfiguration('ha');

    if (!lpar) {
      window.showErrorMessage('LPAR not configured');
      return openSettings();
    }

    const editor = window.activeTextEditor;
    if (editor && editor.document) {
      const { base } = parse(editor.document.uri.fsPath);
      // resulting files
      const file$ = findFile(base, lpar)
        .pipe(reduce((res: string[], item) => [...res, item], []))
        .toPromise();
      return window.showQuickPick(file$);
    }
  };
}
