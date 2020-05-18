// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext, window } from 'vscode';
import { createFindFilesCommand } from './commands/find.file';
import { EXT_NAME } from './constants';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(`Congratulations, your extension "${EXT_NAME}" is now active!`);

  const channel = window.createOutputChannel(EXT_NAME);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand(
    'hosting-appliance.helloWorld',
    () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      window.showInformationMessage('Hello World from hosting-appliance!');
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(
    commands.registerCommand(
      `${EXT_NAME}.findFiles`,
      createFindFilesCommand(channel, context)
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
