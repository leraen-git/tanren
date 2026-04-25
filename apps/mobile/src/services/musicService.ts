export interface NowPlayingInfo {
  title: string
  artist: string
  artwork: string | null
  isPlaying: boolean
}

export async function initMusicService(): Promise<void> {}

export function subscribeNowPlaying(_cb: (info: NowPlayingInfo | null) => void): () => void {
  return () => {}
}

export function getNowPlaying(): NowPlayingInfo | null {
  return null
}

export function playPause(): void {}
export function nextTrack(): void {}
export function prevTrack(): void {}
