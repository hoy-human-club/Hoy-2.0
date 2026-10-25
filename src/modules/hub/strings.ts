import type { StringTable } from '../../i18n/types';
import { HOY_PRODUCT, HUB_EXPERIENCES, HUB_TOOL_LIST } from '../../hub/hubMap.data';

const cardStrings: StringTable = Object.fromEntries([
  ...HUB_EXPERIENCES.flatMap((e) => [
    [`hub.card.${e.id}`, e.label],
    [`hub.card.${e.id}.body`, e.purpose],
    ...(e.secondary ? [[`hub.card.${e.id}.secondary`, e.secondary.label]] : []),
  ]),
  ...HUB_TOOL_LIST.flatMap((x) => [[`hub.tool.${x.id}`, x.label], [`hub.tool.${x.id}.body`, x.purpose]]),
]);

export const strings: StringTable = {
  // Header and hero
  'hub.title': { es: 'HoyOS · hub de pruebas', en: 'HoyOS · testing hub' },
  // The lead is the product tagline the hub map publishes (src/hub/hubMap.data.ts HOY_PRODUCT).
  'hub.lead': HOY_PRODUCT.tagline,
  'hub.version': { es: 'v{v}', en: 'v{v}' },
  'hub.session': { es: 'Estás probando como', en: 'You are testing as' },
  'hub.report': { es: 'Reportar un problema', en: 'Report a problem' },
  'hub.report.localOnly': { es: 'Prototipo desconectado: no se envía ningún reporte. Solo puedes guardar un borrador en este navegador; no aparece en otros dispositivos. Usa detalles ficticios, sin datos privados.', en: 'Disconnected prototype: no report is sent. You can save a draft on this browser only; it does not appear on other devices. Use fictional details without private data.' },
  'hub.report.screen': { es: 'Pantalla', en: 'Screen' },
  'hub.report.actor': { es: 'Usuario de demostración', en: 'Demo user' },
  'hub.report.role': { es: 'Rol efectivo', en: 'Effective role' },
  'hub.report.subject': { es: 'Resumen del problema', en: 'Problem summary' },
  'hub.report.subjectError': { es: 'Escribe entre 3 y 120 caracteres.', en: 'Enter between 3 and 120 characters.' },
  'hub.report.details': { es: 'Pasos y resultado esperado', en: 'Steps and expected result' },
  'hub.report.detailsHint': { es: 'Entre 10 y 2000 caracteres. Solo información ficticia; no incluyas contraseñas ni información personal.', en: 'Between 10 and 2000 characters. Fictional information only; do not include passwords or personal information.' },
  'hub.report.detailsError': { es: 'Escribe entre 10 y 2000 caracteres.', en: 'Enter between 10 and 2000 characters.' },
  'hub.report.preview': { es: 'Revisar borrador local', en: 'Preview local draft' },
  'hub.report.cancel': { es: 'Cancelar sin guardar', en: 'Cancel without saving' },
  'hub.report.save': { es: 'Guardar en este navegador', en: 'Save on this browser' },
  'hub.report.retry': { es: 'Reintentar guardado local', en: 'Retry local save' },
  'hub.report.saved': { es: 'Borrador guardado solo en este navegador. No se envió ningún reporte.', en: 'Draft saved on this browser only. No report was sent.' },
  'hub.report.savedButton': { es: 'Guardado localmente', en: 'Saved locally' },
  'hub.report.edit': { es: 'Editar borrador', en: 'Edit draft' },
  'hub.report.close': { es: 'Cerrar', en: 'Close' },
  'hub.report.loadFailed': { es: 'No se pudo leer el borrador local. No se envió nada. Reabre el formulario para reintentar.', en: 'The local draft could not be read. Nothing was sent. Reopen the form to retry.' },
  'hub.report.saveFailed': { es: 'No se guardó el borrador. El texto sigue aquí; reintenta el guardado local.', en: 'The draft was not saved. Your text is still here; retry the local save.' },
  'hub.devHint': { es: 'Modo dev: cada página muestra su chip de spec y Ctrl + . abre el inspector.', en: 'Dev mode: every page shows its spec chip and Ctrl + . opens the inspector.' },
  'hub.wireframe': { es: 'Wireframe', en: 'Wireframe' },
  // 0161 · bento hub (layout B)
  'hub.bento.label': { es: 'Hub de pruebas', en: 'Testing hub' },
  'hub.bento.one': { es: 'Un sistema,', en: 'One system,' },
  'hub.bento.every': { es: 'cada puesto', en: 'every seat' },
  'hub.bento.at': { es: 'del', en: 'at the' },
  'hub.bento.studio': { es: 'estudio', en: 'studio' },
  'hub.bento.lead': { es: 'Elige a quién estás probando y abre su inicio, o entra directo a cualquier pantalla de abajo. Todo son datos ficticios.', en: 'Pick who you are testing as and open their home, or go straight into any screen below. Everything is fictional data.' },
  'hub.details.show': { es: 'Ver detalles de {name}', en: 'Show details: {name}' },
  'hub.details.hide': { es: 'Ocultar detalles de {name}', en: 'Hide details: {name}' },
  'hub.bento.openHome': { es: 'Abrir el inicio de {name}', en: 'Open {name}’s home' },
  'hub.bento.opening': { es: 'Día de apertura', en: 'Opening day' },
  'hub.bento.daysLeft': { es: 'Abrimos en {n} días', en: 'Opening in {n} days' },

  // Bands
  'hub.band.promotions.eyebrow': { es: 'Aprender y practicar', en: 'Learn and practise' },
  'hub.band.promotions.title': { es: 'De la invitación al check-in', en: 'From invitation to check-in' },
  'hub.band.promotions.body': { es: 'Empieza aquí para conocer el recorrido de promociones. Una vista previa para cualquier persona con acceso al Hub.', en: 'Start here to learn the promotions journey. A preview for anyone with Hub access.' },
  'hub.training.preview': { es: 'Formación · práctica aislada', en: 'Training · isolated practice' },
  'hub.training.open': { es: 'Abrir la práctica', en: 'Open the practice' },
  'hub.training.everyone': { es: 'Todos los roles', en: 'All roles' },
  'hub.band.outside.eyebrow': { es: 'Fuera del estudio', en: 'Outside the studio' },
  'hub.band.outside.title': { es: 'Lo que ve un miembro', en: 'What a member sees' },
  'hub.band.outside.body': { es: 'La puerta de entrada: el sitio público, la app donde se reserva y la app con la que enseña el profesor.', en: 'The way in: the public site, the app people book from, and the app a teacher runs a class with.' },
  'hub.band.team.eyebrow': { es: 'El equipo', en: 'The team' },
  'hub.band.team.title': { es: 'Cada puesto del estudio', en: 'Every seat at the studio' },
  'hub.band.team.body': { es: 'Entra como la persona que hace el trabajo: recepción, caja, coordinación, administración y finanzas, cada una con lo suyo y nada más.', en: 'Enter as the person doing the job: front desk, register, coordination, admin and finance — each with their own screens and nothing more.' },
  'hub.band.build.eyebrow': { es: 'Construcción y pruebas', en: 'Build & test' },
  'hub.band.build.title': { es: 'Cómo se opera y cómo se construye', en: 'How it is run and how it is built' },
  'hub.band.build.body': { es: 'El manual del club, la documentación con cada prompt y cambio, el tablero de trabajo y las herramientas de desarrollo.', en: 'The club’s manual, the documentation with every prompt and change, the work board and the developer tooling.' },
  'hub.band.tools.eyebrow': { es: 'Hub de pruebas', en: 'Testing hub' },
  'hub.band.tools.title': { es: 'Todo el sistema de un vistazo', en: 'See the whole system at once' },
  'hub.band.tools.body': { es: 'Lienzo de páginas, simulador de dispositivos, specs, tablas, componentes, tokens, decisiones y capturas.', en: 'Page canvas, device simulator, specs, tables, components, tokens, decisions and captures.' },

  // Surface cards and the tools row: label and body come from the hub map data (one source for this
  // page and public/hub-map.json), keyed hub.card.<id>[.body|.secondary] and hub.tool.<id>[.body].
  ...cardStrings,

  // Card chrome
  'hub.open': { es: 'Abrir', en: 'Open' },
  'hub.enterAs': { es: 'Entrar como {name}', en: 'Enter as {name}' },
  'hub.here': { es: 'Estás aquí', en: 'You are here' },
  'hub.new': { es: 'Nuevo', en: 'New' },
  'hub.status.built': { es: 'Construida', en: 'Built' },
  'hub.status.stub': { es: 'Esbozo', en: 'Stub' },
  'hub.status.planned': { es: 'Planeada', en: 'Planned' },
  'hub.status.soon': { es: 'Próximamente', en: 'Coming soon' },
  'hub.soon.cta': { es: 'Próximamente', en: 'Coming soon' },
  'hub.soon.today': { es: 'Mientras tanto: {code} →', en: 'Meanwhile: {code} →' },

  // Stat strip and footer
  'hub.stats.label': { es: 'El sistema en números', en: 'The system in numbers' },
  'hub.stat.routes': { es: 'Rutas', en: 'Routes' },
  'hub.stat.codes': { es: 'Códigos de página', en: 'Page codes' },
  'hub.stat.tables': { es: 'Tablas', en: 'Tables' },
  'hub.stat.components': { es: 'Componentes', en: 'Components' },
  'hub.stat.actions': { es: 'Acciones', en: 'Actions' },
  'hub.stat.chapters': { es: 'Capítulos del manual', en: 'Manual chapters' },
  'hub.footer': { es: 'HoyOS v{v} · pruebas públicas · datos demo', en: 'HoyOS v{v} · public testing · demo data' },
};
