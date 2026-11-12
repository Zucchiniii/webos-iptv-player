import type { Channel, ParsedPlaylist } from '../types';
import {
  M3UStreamParser,
  parseM3UBytes,
  type M3UParseOptions,
} from './m3u-parser';
import {
  createXtreamLiveMatcher,
} from '../utils/xtream-live-match';
import { createLogger } from '../utils/logger';
import { createGroupNameMatcher, type XtreamGroupNameFilter } from '../utils/xtream-category-filter';
import { isOnDemandStreamLocation } from '../utils/on-demand-url';
import { runAppWorkerTask } from '../workers/app-worker-client';
import type {
  M3UWorkerChunk,
  M3UWorkerRequest,
  M3UWorkerResponse,
} from '../workers/tasks';
import type { XtreamLiveReference } from '../utils/xtream-live-match';
import type { XtreamLiveStream } from '../services/xtream-client';

export type M3ULoadResult = M3UWorkerResponse;
export interface M3ULoadLimits {
  dropOnDemand?: boolean;
  maxChannels?: number;
}
export interface M3ULoadProgress {
  inputBytes: number;
  chunks: number;
  channelsProcessed: number;
  channelsKept: number;
  channelsDropped: number;
}
const log = createLogger('M3ULoad');
const CHANNEL_BATCH_SIZE = 512;
const PROGRESS_INTERVAL_BYTES = 8 * 1024 * 1024;

export async function fetchAndParseM3U(
  url: string,
  timeout = 30000,
  liveStreams?: XtreamLiveStream[],
  xtreamBaseUrl = '',
  onProgress?: (progress: M3ULoadProgress) => void,
  groupFilter?: XtreamGroupNameFilter,
  limits: M3ULoadLimits = {},
): Promise<M3ULoadResult> {
  const started = Date.now();
  const filter = liveStreams !== undefined
    ? 'live_catalog'
    : xtreamBaseUrl
      ? 'unavailable'
      : 'none';
  log.info(
    'M3U stream load started',
    'event=playlist.m3u.load.started',
    `filter=${filter}`,
    `items=${String(liveStreams?.length ?? 0)}`,
    `timeoutMs=${String(timeout)}`,
  );
  const request: M3UWorkerRequest = {
    url,
    timeout,
    xtreamLive: liveStreams
      ? liveStreams.map(stream => ({
          streamId: stream.streamId,
          directSource: stream.directSource,
        }))
      : undefined,
    ...(xtreamBaseUrl ? { xtreamBaseUrl } : {}),
    ...(groupFilter ? { xtreamGroupFilter: groupFilter } : {}),
    ...(limits.dropOnDemand ? { dropOnDemand: true } : {}),
    ...(limits.maxChannels ? { maxChannels: limits.maxChannels } : {}),
  };
  const channelBatches: Channel[] = [];
  const interned = createChannelInterner();
  const handleChunk = (chunk: M3UWorkerChunk): void => {
    if (chunk.kind === 'channels') {
      for (const channel of chunk.channels) channelBatches.push(interned(channel));
    } else {
      log.info(
        'M3U stream load progress',
        'event=playlist.m3u.load.progress',
        `bytes=${String(chunk.inputBytes)}`,
        `chunks=${String(chunk.chunks)}`,
        `emitted=${String(chunk.channelsEmitted)}`,
        `dropped=${String(chunk.channelsDropped)}`,
      );
    }
    onProgress?.({
      inputBytes: chunk.inputBytes,
      chunks: chunk.chunks,
      channelsProcessed: chunk.channelsEmitted + chunk.channelsDropped,
      channelsKept: chunk.channelsEmitted,
      channelsDropped: chunk.channelsDropped,
    });
  };
  let result: M3UWorkerResponse;
  try {
    result = typeof Worker === 'undefined'
      ? await fetchAndParseM3UInWorker(request, handleChunk)
      : await runAppWorkerTask('m3u.load', request, handleChunk);
  } catch (error) {
    const details = m3uWorkerFailureDetails(error);
    log.error(
      'M3U stream load failed',
      'event=playlist.m3u.load.failed',
      `stage=${details?.stage ?? 'worker'}`,
      `reason=${details?.reason ?? 'exception'}`,
      `filter=${details?.filter ?? filter}`,
      `bytes=${String(details?.inputBytes ?? 0)}`,
      `chunks=${String(details?.chunks ?? 0)}`,
      `elapsedMs=${String(details?.elapsedMs ?? Date.now() - started)}`,
      error,
    );
    throw error;
  }
  if (channelBatches.length) {
    for (const channel of result.data.channels) channelBatches.push(interned(channel));
    result.data.channels = channelBatches;
  } else {
    result.data.channels = result.data.channels.map(interned);
  }
  log.info(
    'M3U stream loaded',
    'event=playlist.m3u.load.completed',
    `transport=${result.metrics.transport}`,
    `filter=${result.metrics.filter}`,
    `bytes=${String(result.metrics.inputBytes)}`,
    `chunks=${String(result.metrics.chunks)}`,
    `kept=${String(result.metrics.channelsKept)}`,
    `dropped=${String(result.metrics.channelsDropped)}`,
    `elapsedMs=${String(result.metrics.elapsedMs)}`,
  );
  return result;
}

interface M3UWorkerFailureDetails {
  stage: string;
  reason: 'timeout' | 'http' | 'exception';
  filter: M3UWorkerResponse['metrics']['filter'];
  inputBytes: number;
  chunks: number;
  elapsedMs: number;
}

class M3UWorkerError extends Error {
  constructor(
    message: string,
    readonly details: M3UWorkerFailureDetails,
  ) {
    super(message);
    this.name = 'M3UWorkerError';
  }
}

function m3uWorkerFailureDetails(error: unknown): M3UWorkerFailureDetails | null {
  if (!(error instanceof Error) || !('details' in error)) return null;
  const details = error.details;
  if (!details || typeof details !== 'object') return null;
  const value = details as Record<string, unknown>;
  const filter = value.filter;
  const reason = value.reason;
  return typeof value.stage === 'string'
    && (reason === 'timeout' || reason === 'http' || reason === 'exception')
    && (filter === 'none' || filter === 'unavailable' || filter === 'live_catalog')
    && typeof value.inputBytes === 'number'
    && typeof value.chunks === 'number'
    && typeof value.elapsedMs === 'number'
    ? {
        stage: value.stage,
        reason,
        filter,
        inputBytes: value.inputBytes,
        chunks: value.chunks,
        elapsedMs: value.elapsedMs,
      }
    : null;
}

export async function fetchAndParseM3UInWorker(
  request: M3UWorkerRequest,
  emitChunk?: (chunk: M3UWorkerChunk) => void,
): Promise<M3UWorkerResponse> {
  const started = Date.now();
  const liveFilters = createXtreamM3ULiveFilters(
    request.xtreamLive,
    request.xtreamBaseUrl,
    request.xtreamGroupFilter,
    request.dropOnDemand === true,
  );
  let emittedChannels = 0;
  let inputBytes = 0;
  let chunks = 0;
  let nextProgressBytes = PROGRESS_INTERVAL_BYTES;
  let reportedInputBytes = -1;
  let reportedChannelsEmitted = -1;
  let reportedChannelsDropped = -1;
  const options: M3UParseOptions = {
    ...(request.maxChannels ? { maxChannels: request.maxChannels } : {}),
    ...(liveFilters.streamLocationPrefilter
      ? { streamLocationPrefilter: liveFilters.streamLocationPrefilter }
      : {}),
    ...(liveFilters.channelPostfilter
      ? { channelPostfilter: liveFilters.channelPostfilter }
      : {}),
    ...(emitChunk
      ? {
          channelBatchSize: CHANNEL_BATCH_SIZE,
          onChannelBatch: (channels: Channel[]) => {
            emittedChannels += channels.length;
            const chunk: M3UWorkerChunk = {
              kind: 'channels',
              channels,
              inputBytes,
              chunks,
              channelsEmitted: emittedChannels,
              channelsDropped: liveFilters.getDroppedCount(),
            };
            emitChunk(chunk);
            rememberProgress(chunk);
          },
        }
      : {}),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeout);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let complete = false;
  let transport: M3UWorkerResponse['metrics']['transport'] = 'stream';
  let stage = 'fetch';
  try {
    const response = await fetch(request.url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    stage = 'read';
    reader = typeof response.body?.getReader === 'function'
      ? response.body.getReader()
      : null;
    let data: ParsedPlaylist;
    if (!reader) {
      transport = 'array_buffer';
      const bytes = new Uint8Array(await response.arrayBuffer());
      inputBytes = bytes.length;
      chunks = bytes.length ? 1 : 0;
      emitM3UProgress();
      stage = 'decode_parse';
      data = parseM3UBytes(bytes, request.url, options);
    } else {
      const parser = new M3UStreamParser(request.url, options);
      const decoder = new PlaylistStreamDecoder(text => parser.write(text));
      while (true) {
        stage = 'read';
        const next = await reader.read();
        if (next.done) {
          complete = true;
          break;
        }
        if (!next.value?.length) continue;
        inputBytes += next.value.length;
        chunks++;
        emitM3UProgress();
        stage = 'decode_parse';
        decoder.write(next.value);
      }
      stage = 'decode_parse';
      decoder.finish();
      stage = 'finish';
      data = parser.finish();
    }
    emitM3UProgress(true);
    const channelsKept = data.channels.length + emittedChannels;
    return {
      data,
      metrics: {
        transport,
        filter: liveFilters.mode,
        inputBytes,
        chunks,
        channelsKept,
        channelsDropped: liveFilters.getDroppedCount(),
        elapsedMs: Date.now() - started,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new M3UWorkerError(message, {
      stage,
      reason: controller.signal.aborted
        ? 'timeout'
        : stage === 'fetch' && message.startsWith('HTTP ')
          ? 'http'
          : 'exception',
      filter: liveFilters.mode,
      inputBytes,
      chunks,
      elapsedMs: Date.now() - started,
    });
  } finally {
    if (reader && !complete) void reader.cancel().catch(() => {});
    clearTimeout(timer);
  }

  function emitM3UProgress(force = false): void {
    if (!emitChunk || (!force && inputBytes < nextProgressBytes)) return;
    const progress: M3UWorkerChunk = {
      kind: 'progress',
      inputBytes,
      chunks,
      channelsEmitted: emittedChannels,
      channelsDropped: liveFilters.getDroppedCount(),
    };
    if (force
      && progress.inputBytes === reportedInputBytes
      && progress.channelsEmitted === reportedChannelsEmitted
      && progress.channelsDropped === reportedChannelsDropped) return;
    emitChunk(progress);
    rememberProgress(progress);
    while (nextProgressBytes <= inputBytes) {
      nextProgressBytes += PROGRESS_INTERVAL_BYTES;
    }
  }

  function rememberProgress(chunk: M3UWorkerChunk): void {
    reportedInputBytes = chunk.inputBytes;
    reportedChannelsEmitted = chunk.channelsEmitted;
    reportedChannelsDropped = chunk.channelsDropped;
  }
}

interface XtreamM3ULiveFilters {
  mode: M3UWorkerResponse['metrics']['filter'];
  streamLocationPrefilter?: (location: string) => boolean;
  channelPostfilter?: (channel: Channel) => boolean;
  getDroppedCount(): number;
}

export function createXtreamM3ULiveFilters(
  references?: XtreamLiveReference[],
  baseUrl = '',
  groupFilter?: XtreamGroupNameFilter,
  dropOnDemand = false,
): XtreamM3ULiveFilters {
  let droppedChannels = 0;
  if (references === undefined) {
    const keepGroup = groupFilter ? createGroupNameMatcher(groupFilter) : null;
    return {
      mode: baseUrl ? 'unavailable' : 'none',
      ...(dropOnDemand
        ? {
            streamLocationPrefilter: (location: string) => {
              if (!isOnDemandStreamLocation(location)) return true;
              droppedChannels++;
              return false;
            },
          }
        : {}),
      ...(keepGroup
        ? {
            channelPostfilter: (channel: Channel) => {
              if (keepGroup(channel.group)) return true;
              droppedChannels++;
              return false;
            },
          }
        : {}),
      getDroppedCount: () => droppedChannels,
    };
  }

  const liveMatcher = createXtreamLiveMatcher(
    references,
    baseUrl,
  );
  return {
    mode: 'live_catalog',
    streamLocationPrefilter: location => {
      if (liveMatcher.streamLocationPrefilter(location)) return true;
      droppedChannels++;
      return false;
    },
    channelPostfilter: channel => {
      const streamId = liveMatcher.resolveStreamId(channel.url);
      if (!streamId) {
        droppedChannels++;
        return false;
      }
      channel.catchupStreamId = channel.catchupStreamId || streamId;
      return true;
    },
    getDroppedCount: () => droppedChannels,
  };
}

/**
 * Each worker batch arrives as its own structured clone, so the same group
 * name or membership list is a fresh copy in every batch. Sharing one copy
 * per distinct value keeps a 100k-channel list from holding 100k duplicates.
 */
export function createChannelInterner(): (channel: Channel) => Channel {
  const strings = new Map<string, string>();
  const intern = (value: string): string => {
    const known = strings.get(value);
    if (known !== undefined) return known;
    strings.set(value, value);
    return value;
  };
  return (channel: Channel): Channel => {
    channel.group = intern(channel.group);
    if (channel.sourceGroups) channel.sourceGroups = channel.sourceGroups.map(intern);
    if (channel.catchup) channel.catchup = intern(channel.catchup);
    return channel;
  };
}

class PlaylistStreamDecoder {
  private prefix: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  private decoder: TextDecoder | null = null;

  constructor(private readonly consume: (text: string) => void) {}

  write(bytes: Uint8Array): void {
    if (!this.decoder) {
      this.prefix = appendBytes(this.prefix, bytes);
      if (!this.activate(false)) return;
      return;
    }
    this.emit(this.decoder.decode(bytes, { stream: true }));
  }

  finish(): void {
    if (!this.decoder) this.activate(true);
    if (this.decoder) this.emit(this.decoder.decode());
  }

  private activate(final: boolean): boolean {
    const detected = detectEncoding(this.prefix, final);
    if (!detected) return false;
    this.decoder = new TextDecoder(detected.encoding);
    this.emit(this.decoder.decode(this.prefix.subarray(detected.offset), { stream: true }));
    this.prefix = new Uint8Array(0);
    return true;
  }

  private emit(text: string): void {
    if (text) this.consume(text);
  }
}

function detectEncoding(
  bytes: Uint8Array,
  final: boolean,
): { encoding: string; offset: number } | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { encoding: 'utf-16le', offset: 2 };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { encoding: 'utf-16be', offset: 2 };
  }
  if (bytes.length >= 3
      && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: 'utf-8', offset: 3 };
  }
  if (bytes.length && bytes[0] !== 0xef && bytes[0] !== 0xff && bytes[0] !== 0xfe) {
    return { encoding: 'utf-8', offset: 0 };
  }
  if (bytes.length >= 3 || final) return { encoding: 'utf-8', offset: 0 };
  return null;
}

function appendBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const joined = new Uint8Array(left.length + right.length);
  joined.set(left);
  joined.set(right, left.length);
  return joined;
}
