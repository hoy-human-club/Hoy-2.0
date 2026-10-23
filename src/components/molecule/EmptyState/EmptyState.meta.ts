import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { EmptyState } from './EmptyState';
import { Button } from '../../atom/Button/Button';

export default defineMeta({
  tier: 'molecule', name: 'EmptyState',
  description: { es: 'Los tres estados de spec (vacío, error, cargando) con el mismo aspecto en toda la app. Enseña el siguiente paso en vez de mostrar un contenedor vacío (regla de E-01).', en: 'The three spec states (empty, error, loading) rendered the same way across the app. Teaches the next step instead of showing an empty container (E-01 rule).' },
  props: [
    { name: 'title', type: 'ReactNode', required: true, description: { es: 'Qué pasa.', en: 'What is going on.' } },
    { name: 'body', type: 'ReactNode', description: { es: 'Contexto o siguiente paso.', en: 'Context or next step.' } },
    { name: 'tone', type: "'empty' | 'error' | 'loading'", default: 'empty', description: { es: 'Semántica del estado.', en: 'State semantics.' } },
    { name: 'icon', type: 'IconName | ReactNode', description: { es: 'Sustituye el glifo por defecto (inbox; circle-alert en error).', en: 'Replaces the default glyph (inbox; circle-alert on error).' } },
    { name: 'action / secondary', type: 'ReactNode', description: { es: 'Botón opcional y enlace secundario debajo.', en: 'Optional button and a secondary link under it.' } },
    { name: 'compact', type: 'boolean', default: 'false', description: { es: 'Menos padding para paneles.', en: 'Less padding for panels.' } },
  ],
  states: ['empty', 'error', 'loading', 'compact', 'with secondary link'],
  usages: [
    { title: { es: 'Vacío con acción', en: 'Empty with action' }, render: () => h(EmptyState, { title: 'Nadie en la lista de espera', body: 'Cuando alguien se anote aparecerá aquí.', action: h(Button, { size: 'sm', variant: 'secondary' }, 'Abrir horario') }) },
    { title: { es: 'Primer día (E-01)', en: 'Day one (E-01)' }, render: () => h(EmptyState, { icon: 'sun', title: 'Tu primera clase te espera', body: 'Aún no tienes reservas. Mira qué hay hoy en el club.', action: h(Button, null, 'Ver clases de hoy'), secondary: h('a', { href: '#' }, 'Tour del estudio →') }) },
    { title: { es: 'Error', en: 'Error' }, render: () => h(EmptyState, { tone: 'error', title: 'No pudimos cargar la clase', body: 'Revisa la conexión e intenta de nuevo.', compact: true }) },
    { title: { es: 'Cargando', en: 'Loading' }, render: () => h(EmptyState, { tone: 'loading', title: 'Cargando…', compact: true }) },
  ],
  a11y: [{ es: 'role=status (o alert en error) y aria-busy mientras carga; el icono es decorativo.', en: 'role=status (alert on error) and aria-busy while loading; the icon is decorative.' }],
  usedBy: ['C-13', 'C-18', 'MaintenanceWorkbench', 'S-02', 'S-03', 'S-04', 'S-06', 'M-02', 'M-04', 'M-05', 'M-06', 'M-07', 'M-09', 'C-02', 'C-03', 'C-11', 'C-24', 'E-01', 'M-08g', 'M-10a', 'D-07'],
});
