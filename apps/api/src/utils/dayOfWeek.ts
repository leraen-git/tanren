// UI/API uses 1-7 (Mon=1, Sun=7), DB stores 0-6 (Sun=0, Mon=1)
export function dowUiToDb(ui: number): number {
  if (ui < 1 || ui > 7) throw new Error(`Invalid UI day: ${ui}`)
  return ui === 7 ? 0 : ui
}

export function dowDbToUi(db: number): number {
  if (db < 0 || db > 6) throw new Error(`Invalid DB day: ${db}`)
  return db === 0 ? 7 : db
}

export const DOW_UI_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
}

export const DOW_UI_SHORT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu',
  5: 'Ven', 6: 'Sam', 7: 'Dim',
}
