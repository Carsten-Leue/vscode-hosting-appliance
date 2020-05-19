import { ExtensionContext, OutputChannel, window } from 'vscode';

import { restartServices } from '../utils/restart';
import { getLpar } from '../utils/settings';

export const createRestartServicesCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () =>
  getLpar()
    .then((lpar) => restartServices(lpar, channel))
    .then(() =>
      window.showInformationMessage('Services restarted successfully.')
    );
