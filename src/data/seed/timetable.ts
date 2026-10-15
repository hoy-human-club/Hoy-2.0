/** Provisional owner-selected “Horario fijo”, 2026-10-15. Public timetable only.
 * Four Mon/Tue evening rows await the studio's final confirmation. No availability or compensation.
 * Duration/capacity remain demo defaults; this is not an operating-hours declaration.
 */
export interface TimetableEntry { weekday: number; time: string; modality: string; teacher: string; title: string }
export const TIMETABLE: readonly TimetableEntry[] = [
  { weekday: 1, time: '06:10', modality: 'mod_hibrido', teacher: 'tea_raghu', title: 'Híbrido · Pilates / Yoga Upper Body' },
  { weekday: 1, time: '07:10', modality: 'mod_alineacion', teacher: 'tea_raghu', title: 'Alineación · Vinyasa Yoga' },
  { weekday: 1, time: '08:10', modality: 'mod_pulso', teacher: 'tea_tatiana', title: 'Pulso · Barre Power Body' },
  { weekday: 1, time: '17:10', modality: 'mod_hibrido', teacher: 'tea_raghu', title: 'Híbrido · Pilates / Yoga Upper Body' },
  { weekday: 1, time: '18:10', modality: 'mod_fuego', teacher: 'tea_raghu', title: 'Fuego · Power Yoga' },
  { weekday: 2, time: '07:10', modality: 'mod_fuego', teacher: 'tea_sara_e', title: 'Fuego · Rumba' },
  { weekday: 2, time: '08:10', modality: 'mod_fuego', teacher: 'tea_sara_e', title: 'Fuego · Step coreográfico' },
  { weekday: 2, time: '09:10', modality: 'mod_solido', teacher: 'tea_sara_e', title: 'Sólido · Pilates Lower Body' },
  { weekday: 2, time: '17:10', modality: 'mod_solido', teacher: 'tea_jennifer', title: 'Sólido · Revolución Pilates Full Body' },
  { weekday: 2, time: '18:10', modality: 'mod_fuego', teacher: 'tea_jennifer', title: 'Fuego · Dance Fitness' },
  { weekday: 3, time: '07:10', modality: 'mod_solido', teacher: 'tea_jennifer', title: 'Sólido · Revolución Pilates Full Body' },
  { weekday: 3, time: '08:10', modality: 'mod_fuego', teacher: 'tea_jennifer', title: 'Fuego · Dance Fitness' },
  { weekday: 3, time: '09:10', modality: 'mod_fuego', teacher: 'tea_clara', title: 'Fuego · Balance Board Power Body' },
  { weekday: 3, time: '17:10', modality: 'mod_fuego', teacher: 'tea_andrea', title: 'Fuego · Step' },
  { weekday: 3, time: '18:10', modality: 'mod_fuego', teacher: 'tea_andrea', title: 'Fuego · Pilates Lower Body' },
  { weekday: 4, time: '07:10', modality: 'mod_fuego', teacher: 'tea_clara', title: 'Fuego · Pilates Upper Body' },
  { weekday: 4, time: '08:10', modality: 'mod_hibrido', teacher: 'tea_andrea', title: 'Híbrido · Pilates + Yoga Full Body' },
  { weekday: 4, time: '09:10', modality: 'mod_alineacion', teacher: 'tea_andrea', title: 'Alineación · Vinyasa Yoga' },
  { weekday: 4, time: '17:10', modality: 'mod_fuego', teacher: 'tea_sara_c', title: 'Fuego · Vinyasa Yoga' },
  { weekday: 4, time: '18:10', modality: 'mod_ligereza', teacher: 'tea_sara_c', title: 'Ligereza · Movilidad' },
  { weekday: 5, time: '06:10', modality: 'mod_hibrido', teacher: 'tea_raghu', title: 'Híbrido · Pilates / Yoga Lower Body' },
  { weekday: 5, time: '07:10', modality: 'mod_solido', teacher: 'tea_raghu', title: 'Sólido · Power Yoga' },
  { weekday: 5, time: '08:10', modality: 'mod_fuego', teacher: 'tea_sara_c', title: 'Fuego · Vinyasa Yoga' },
  { weekday: 5, time: '17:10', modality: 'mod_ligereza', teacher: 'tea_carolina', title: 'Ligereza · Stretching' },
  { weekday: 5, time: '18:10', modality: 'mod_fuego', teacher: 'tea_leandro', title: 'Fuego · Power Yoga' },
  { weekday: 6, time: '07:10', modality: 'mod_pulso', teacher: 'tea_carolina', title: 'Pulso · Barre Full Body' },
  { weekday: 6, time: '08:10', modality: 'mod_fuego', teacher: 'tea_tatiana', title: 'Fuego · Pilates Upper Body' },
  { weekday: 6, time: '09:10', modality: 'mod_solido', teacher: 'tea_tatiana', title: 'Sólido · Pilates Power Body' },
  { weekday: 0, time: '08:10', modality: 'mod_fuego', teacher: 'tea_maria_camila', title: 'Fuego · Pilates Full Body' },
  { weekday: 0, time: '09:10', modality: 'mod_pulso', teacher: 'tea_maria_camila', title: 'Pulso · Barre Lower Body' },
];
export const timetableId = (row: TimetableEntry) => `tpl_fixed_${row.weekday}_${row.time.replace(':', '')}`;
