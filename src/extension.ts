// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, OutputChannel, window } from 'vscode';

import { createCopyToLparCommand } from './commands/copy.to.lpar';
import { createFindFilesCommand } from './commands/find.file';
import { createGetRepositoriesCommand } from './commands/get.repositories';
import { createResetMappingCommand } from './commands/reset.mapping';
import { createRestartServicesCommand } from './commands/restart.services';
import { createRunUnitTestCommand } from './commands/run.unit.test';
import { createShowConfigCommand } from './commands/show.config';
import { EXT_NAME } from './constants';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(`Congratulations, your extension "${EXT_NAME}" is now active!`);

  const channel = window.createOutputChannel(EXT_NAME);

  function addCommand(
    aName: string,
    aCreator: (
      aChannel: OutputChannel,
      aContext: ExtensionContext
    ) => (...args: any[]) => any
  ) {
    context.subscriptions.push(
      commands.registerCommand(
        `${EXT_NAME}.${aName}`,
        aCreator(channel, context)
      )
    );
  }

  addCommand('findFiles', createFindFilesCommand);
  addCommand('copyToLpar', createCopyToLparCommand);
  addCommand('showConfig', createShowConfigCommand);
  addCommand('resetMapping', createResetMappingCommand);
  addCommand('runUnitTest', createRunUnitTestCommand);
  addCommand('restartServices', createRestartServicesCommand);
  addCommand('getRepositories', createGetRepositoriesCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
