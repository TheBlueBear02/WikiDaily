export const FREE_GAME_TARGETS = [
  'Albert_Einstein',
  'World_War_II',
  'United_States',
  'Mathematics',
  'Ancient_Rome',
  'DNA',
  'Moon',
  'Solar_System',
  'Evolution',
  'Isaac_Newton',
  'Leonardo_da_Vinci',
  'William_Shakespeare',
  'French_Revolution',
  'Ancient_Greece',
  'Quantum_mechanics',
  'Black_hole',
  'Human_brain',
  'Climate_change',
  'China',
  'Ancient_Egypt',
  'Beethoven',
  'Napoleon',
  'Photography',
  'Internet',
  'Periodic_table',
  'Olympic_Games',
  'United_Kingdom',
  'Philosophy',
  'Psychology',
  'Buddhism',
  'Roman_Empire',
  'Charles_Darwin',
  'Electricity',
  'Astronomy',
  'Economics',
  'Dinosaur',
  'Photosynthesis',
  'Democracy',
  'Music',
  'Language',
]

export function pickRandomTarget(excludeSlug = null) {
  const pool = excludeSlug
    ? FREE_GAME_TARGETS.filter((s) => s !== excludeSlug)
    : FREE_GAME_TARGETS
  return pool[Math.floor(Math.random() * pool.length)]
}
