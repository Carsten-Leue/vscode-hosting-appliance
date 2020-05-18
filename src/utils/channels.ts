import { OutputChannel, window } from 'vscode';

const CHANNELS: Record<string, OutputChannel> = {};

export function getOutputChannel(aName: string): OutputChannel {
  return (
    CHANNELS[aName] || (CHANNELS[aName] = window.createOutputChannel(aName))
  );
}
