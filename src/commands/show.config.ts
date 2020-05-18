import { OutputChannel, ExtensionContext } from 'vscode';
import { openSettings } from '../utils/settings';

export const createShowConfigCommand = (
  channel: OutputChannel,
  context: ExtensionContext
) => () => openSettings();
