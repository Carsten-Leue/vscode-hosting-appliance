import { ExtensionContext, OutputChannel } from 'vscode';

import { selectRepository } from '../utils/repositories';
import { getLpar } from '../utils/settings';
import { createAuthenticator } from './http.utils';

export const createGetRepositoriesCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => {
  // credentials
  const auth = createAuthenticator(channel, context);
  // get some configs
  const lpar$ = getLpar();
  // display the quick pick
  return lpar$.then((lpar) => selectRepository(lpar, auth));
};
