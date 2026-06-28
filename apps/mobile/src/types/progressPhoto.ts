export type PhotoAngle = 'front' | 'side' | 'back'

export type ProgressPhoto = {
  id: string
  uri: string
  takenAt: string
  angle: PhotoAngle
  weightKgSnapshot: number | null
  notes: string | null
}

export function getAngleLabels(t: (key: string) => string): Record<PhotoAngle, string> {
  return {
    front: t('evolution.angleFront'),
    side: t('evolution.angleSide'),
    back: t('evolution.angleBack'),
  }
}

/** @deprecated Use getAngleLabels(t) instead for proper i18n */
export const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
}
