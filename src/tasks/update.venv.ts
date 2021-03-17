import { OutputChannel, ShellExecution, Task, TaskScope } from 'vscode';
import { EXT_NAME } from './../constants';

export function getUpdateVirtualEnvironmentTask(channel: OutputChannel): Task {
  return new Task(
    { type: EXT_NAME },
    TaskScope.Workspace,
    'Upgrade Virtual Environment',
    'HA',
    new ShellExecution(
      '${config:python.pythonPath}',
      [
        '-m',
        'pip',
        'install',
        'pip',
        '-r',
        'requirements.txt',
        '-r',
        'test-requirements.txt',
        '--upgrade',
      ],
      {
        cwd: '${workspaceFolder}',
      }
    )
  );
}
