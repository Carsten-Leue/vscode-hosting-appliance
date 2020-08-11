import { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OutputChannel, window } from 'vscode';

import { FileDescriptor } from './file';

const CHANNELS: Record<string, OutputChannel> = {};

export function getOutputChannel(aName: string): OutputChannel {
  return (
    CHANNELS[aName] || (CHANNELS[aName] = window.createOutputChannel(aName))
  );
}

export function createFileLogger<T>(
  aChannel: OutputChannel
): MonoTypeOperatorFunction<FileDescriptor<T>> {
  return tap<FileDescriptor<T>>(([path]) => aChannel.appendLine(path));
}
