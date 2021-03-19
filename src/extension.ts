// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, OutputChannel, window } from 'vscode';
import { createCopyFromLparCommand } from './commands/copy.from.lpar';
import { createCopyToLparCommand } from './commands/copy.to.lpar';
import { createPackageCommand } from './commands/create.package';
import { createFindFilesCommand } from './commands/find.file';
import { createGetRepositoriesCommand } from './commands/get.repositories';
import { createInjectablesCommand } from './commands/injectables';
import { createProvidersCommand } from './commands/providers';
import { createReleaseComponentCommand } from './commands/release.component';
import { createResetMappingCommand } from './commands/reset.mapping';
import { createRestartServicesCommand } from './commands/restart.services';
import { createRunUnitTestCommand } from './commands/run.unit.test';
import { createShowConfigCommand } from './commands/show.config';
import { createSyncWithVEnvCommand } from './commands/sync.with.venv';
import { createUpdateVEnvCommand } from './commands/update.venv';
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
    // register the command
    context.subscriptions.push(
      commands.registerCommand(
        `${EXT_NAME}.${aName}`,
        aCreator(channel, context)
      )
    );
    // log this
    channel.appendLine(`Registering command [${EXT_NAME}.${aName}] ...`);
  }

  // commands
  addCommand('findFiles', createFindFilesCommand);
  addCommand('copyToLpar', createCopyToLparCommand);
  addCommand('copyFromLpar', createCopyFromLparCommand);
  addCommand('showConfig', createShowConfigCommand);
  addCommand('resetMapping', createResetMappingCommand);
  addCommand('runUnitTest', createRunUnitTestCommand);
  addCommand('restartServices', createRestartServicesCommand);
  addCommand('getRepositories', createGetRepositoriesCommand);
  addCommand('syncWithVenv', createSyncWithVEnvCommand);
  addCommand('updateVenv', createUpdateVEnvCommand);
  addCommand('injectables', createInjectablesCommand);
  addCommand('providers', createProvidersCommand);
  addCommand('package', createPackageCommand);
  addCommand('releaseComponent', createReleaseComponentCommand)
}

// this method is called when your extension is deactivated
export function deactivate() {}
