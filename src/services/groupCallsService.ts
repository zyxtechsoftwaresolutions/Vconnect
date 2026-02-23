/**
 * Group calls service – generates Jitsi Meet links for video/audio calls.
 * No API keys or backend required; works in browser and on mobile.
 */

const JITSI_BASE = 'https://meet.jit.si';

function shortId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

function urlSafeRoomName(groupId: string): string {
  const id = groupId.replace(/-/g, '').slice(0, 8);
  return `VCONNECT-${id}-${shortId()}`;
}

export type CallType = 'video' | 'audio';

export interface CreateMeetingOptions {
  groupId: string;
  groupName: string;
  callType: CallType;
  title?: string;
  scheduledAt?: string;
}

/**
 * Generate a Jitsi Meet URL for instant or scheduled calls.
 */
export function createMeetingUrl(options: CreateMeetingOptions): Promise<string> {
  const room = urlSafeRoomName(options.groupId);
  const base = `${JITSI_BASE}/${room}`;
  const params = new URLSearchParams();
  if (options.callType === 'audio') {
    params.set('config.startWithAudioMuted', 'false');
    params.set('config.startVideoMuted', 'true');
  }
  const query = params.toString();
  const url = query ? `${base}?${query}` : base;
  return Promise.resolve(url);
}
