import { EVERYONE } from '../../auth/roles';
import { defineSpec } from '../../specs/define';

export const promotionsGuideSpec = defineSpec({
  code: 'P-02',
  name: { es: 'Promociones · aprender y probar', en: 'Promotions · learn and practise' },
  purpose: {
    es: 'Aprender el recorrido de una promoción y practicar con un ejemplo aislado, desde el Hub y con cualquier rol.',
    en: 'Learn the promotion journey and practise with an isolated example, from the Hub with any role.',
  },
  layout: ['overview', 'practice', 'workspaces'],
  data: ['page_layouts'], roles: EVERYONE, integrations: [],
  logic: [
    'Same access as /hub. Entering the guide never changes the session, effective role or permissions.',
    'The persistent sandbox notice is outside reorderable sections and cannot be hidden by a layout setting.',
    'Three steps: approved offer and teacher share; recipient activation and booking; front-desk verification and check-in.',
    'PromotionPractice uses component-local state only. It never writes vouchers, bookings, attendance or any provider table, and resets on leaving or reloading the page.',
    'A fictional short code is checked locally. Verification is required before the simulated check-in; the practice can be restarted.',
    'Workspace links are resolved from the registered routes and gated with the same hasRole check used by RequireRole. Unavailable or unauthorized routes have explanatory non-link states.',
    'No role-switching iframe is used: the existing DeviceFrame isolates session keys but does not isolate data writes.',
  ],
  states: ['Approved example', 'Share simulated', 'Booking simulated', 'Incorrect sample code', 'Verified sample code', 'Check-in simulated', 'Reset', 'Role-allowed workspace', 'Role-restricted workspace', 'Spanish', 'English', 'Dark theme'],
});
