import { EXT_NAME } from '../constants';
import { commands } from 'vscode';

export function openSettings() {
  return commands.executeCommand('workbench.action.openSettings', EXT_NAME);
}
