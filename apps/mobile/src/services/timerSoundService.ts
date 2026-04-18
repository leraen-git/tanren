import { AudioPlayer, createAudioPlayer } from 'expo-audio'

let player: AudioPlayer | null = null

export function playTimerChime(): void {
  try {
    if (player) {
      player.seekTo(0)
      player.play()
    } else {
      player = createAudioPlayer(require('../../assets/timer-chime.wav'))
      player.play()
    }
  } catch {
    // Silent fail — sound is non-critical
  }
}
