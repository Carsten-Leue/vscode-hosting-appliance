import { ExtensionContext, OutputChannel } from 'vscode';

import { getLpar } from '../utils/settings';
import { getActiveDocument, resetMapping } from './copy.utils';

export const createResetMappingCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // get some configs
  const lpar$ = getLpar();
  const uri$ = getActiveDocument();
  // copy
  return Promise.all([uri$, lpar$]).then(([uri, lpar]) =>
    resetMapping(uri, lpar, channel, context)
  );
};
