import { OutputChannel, Task, TaskProvider } from 'vscode';
import { getUpdateVirtualEnvironmentTask } from './update.venv';

const resolveTask = (task: Task) => undefined;

export function getTaskProvider(channel: OutputChannel): TaskProvider<Task> {
  channel.appendLine('Task provider registered ...');

  const provideTasks = () => [getUpdateVirtualEnvironmentTask(channel)];

  return {
    provideTasks,
    resolveTask,
  };
}
