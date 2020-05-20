import { ExtensionContext, OutputChannel } from 'vscode';

import { getLpar } from '../utils/settings';
import { getActiveDocument, resetMapping, syncLocal } from './copy.utils';

export const createSyncWithVEnvCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // get some configs
  const lpar$ = getLpar();
  const uri$ = getActiveDocument();
  // copy
  return Promise.all([uri$, lpar$]).then(([uri, lpar]) =>
    syncLocal(uri, lpar, channel, context)
  );
};
