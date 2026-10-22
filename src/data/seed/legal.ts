/**
 * A-06 — the legal library as data: bilingual, versioned rows of `legal_documents`.
 *
 * Every body is markdown with two kinds of token, resolved at render time by
 * `resolveLegalTokens()` (src/components/organism/LegalDocument):
 *   {{tenant.*}}  — studio identity, from src/tenant/tenant.ts + M-08 settings (never hardcoded here,
 *                   so the same copy serves another studio)
 *   {{policy.*}}  — the operating numbers from M-08 (`usePolicy()`), so a cancellation window changed
 *                   in Settings changes the legal page in the same breath and the text never goes stale.
 *
 * The copy is written by the studio and is NOT reviewed by counsel yet: every document renders a
 * "borrador para revisión de abogado / draft pending counsel review" notice, and the four documents
 * that are not operationally in force carry status = 'draft'. Colombian framing throughout:
 * Ley 1581 de 2012 + Decreto 1377 de 2013 (habeas data, SIC), Ley 1480 de 2011 (Estatuto del
 * Consumidor, derecho de retracto art. 47), Ley 527 de 1999 (firma electrónica).
 */
import type { LegalDocumentRow } from '../schema';
import { base, iso, NOW } from './catalog';
import { dateKey, atStudioTime, addMonths } from '../../i18n/format';

const monthsAgo = (n: number) => { return atStudioTime(addMonths(NOW, -n), 0); };

interface Draft {
  id: string;
  kind: LegalDocumentRow['kind'];
  version: string;
  status: LegalDocumentRow['status'];
  requiresAcceptance?: boolean;
  monthsOld: number;
  title: { es: string; en: string };
  summary: { es: string; en: string };
  body: { es: string; en: string };
}

// ---------------------------------------------------------------------------------------------
// 1 · Términos y condiciones
// ---------------------------------------------------------------------------------------------
const TERMS_ES = `## 1. Quiénes somos

{{tenant.legalName}} ("{{tenant.name}}", "el estudio", "nosotros"), NIT {{tenant.nit}}, con domicilio en {{tenant.address}}, {{tenant.city}}, Colombia, opera un centro de bienestar y la plataforma digital con la que reservas y pagas tus clases. Puedes escribirnos a {{tenant.email}} o por WhatsApp al {{tenant.whatsapp}}.

## 2. Qué aceptas al usar la plataforma

Al crear una cuenta, reservar una clase o comprar un plan aceptas estos términos, la Política de privacidad, la Exoneración de responsabilidad y las Reglas de casa. Si no estás de acuerdo con alguno, no uses la plataforma ni ingreses a la sala.

Debes ser mayor de 18 años para crear una cuenta. Entre 14 y 18 años puedes practicar con autorización escrita de tu padre, madre o representante legal, quien firma también la exoneración.

## 3. Tu cuenta

Los datos que registras deben ser verdaderos y actuales, en especial tu teléfono, tu correo y tu contacto de emergencia. Tu cuenta es personal e intransferible: el ingreso a la sala se valida contra la reserva a tu nombre. Eres responsable de la actividad realizada con tus credenciales; si sospechas un uso indebido, avísanos de inmediato.

## 4. Planes, pases y membresías

- Los precios se publican en pesos colombianos (COP) e incluyen IVA cuando aplique. La tarifa vigente es la que aparece en la plataforma al momento de la compra.
- Los **pases y paquetes** otorgan un número de clases con una vigencia expresa. Las clases no usadas dentro de la vigencia se extinguen y no se reembolsan ni se transfieren, salvo lo previsto en la Política de cancelaciones.
- Las **membresías** son de pago recurrente. Te avisamos {{policy.chargeNoticeDays}} días antes de cada cobro. Puedes cancelar la renovación en cualquier momento desde la app; conservas el acceso hasta el final del periodo ya pagado.
- Puedes **pausar** tu membresía hasta {{policy.pauseDaysPerYear}} días por año, en máximo {{policy.maxPausesPerYear}} pausas; la fecha de renovación se corre por los días pausados.
- Los planes son personales. No se comparten, revenden ni ceden. Un mal uso faculta al estudio a suspender el plan sin reembolso del saldo.

## 5. Reservas, cupos y asistencia

La sala tiene {{tenant.mats}} mats y {{tenant.perPersonPerDay}} clase por persona al día. La reserva se confirma cuando el cupo queda tomado en la plataforma.

- Puedes cancelar sin costo hasta **{{policy.cancellationHours}} horas** antes del inicio; dentro de esa ventana la clase se consume. El detalle está en la Política de cancelaciones, que hace parte de estos términos.
- Si un cupo se libera, quien esté primero en lista de espera tiene **{{policy.waitlistClaimMin}} minutos** para reclamarlo.
- Llega con tiempo: pasados **{{policy.lateGraceMin}} minutos** del inicio no se permite el ingreso, por seguridad y por respeto a la clase en curso.

## 6. Pagos

Los pagos electrónicos (tarjeta, PSE, Nequi) se procesan a través de nuestra pasarela de pagos; el estudio no almacena el número completo de tu tarjeta. Aceptamos además efectivo y transferencia en recepción. Un pago rechazado no confirma la compra ni la reserva.

La factura electrónica se emite conforme a la normativa DIAN vigente y se envía al correo registrado.

## 7. Derecho de retracto y reversión del pago

Conforme al artículo 47 de la Ley 1480 de 2011, en compras realizadas por medios electrónicos tienes derecho de retracto dentro de los **cinco (5) días hábiles** siguientes a la compra, siempre que no hayas comenzado a usar el servicio (es decir, que no hayas tomado ninguna clase del plan). También puedes solicitar la reversión del pago en los casos del artículo 51 de la misma ley. El procedimiento está en la Política de reembolsos.

## 8. Cambios en la programación

Podemos cambiar profesor, sala u horario, o cancelar una clase por fuerza mayor, mantenimiento, clima o un número insuficiente de asistentes. Si el estudio cancela, te devolvemos la clase a tu saldo o, a tu elección, el dinero. Avisamos por WhatsApp, correo y notificación en la app.

## 9. Conducta y permanencia

Las Reglas de casa hacen parte de estos términos. El estudio puede negar el ingreso o terminar la relación, con devolución proporcional de lo pagado y no usado, ante conductas que pongan en riesgo la seguridad o la tranquilidad de la sala, acoso, discriminación o incumplimiento reiterado de las reglas.

## 10. Uso del espacio para fotos, video y eventos

El alquiler del espacio para rodajes, talleres o eventos se rige por una cotización y un contrato aparte. Dentro de la sala no se graba ni se fotografía a otras personas sin su consentimiento expreso.

## 11. Propiedad intelectual

La marca, el nombre, el diseño de la plataforma, las secuencias de clase y los contenidos son de {{tenant.legalName}} o de sus licenciantes. No pueden reproducirse con fines comerciales sin autorización escrita.

## 12. Responsabilidad

La práctica física implica riesgo; lo aceptas en la Exoneración de responsabilidad. Salvo dolo o culpa grave, la responsabilidad del estudio se limita al valor pagado por el servicio afectado. Nada en estos términos limita los derechos que la ley colombiana reconoce al consumidor como irrenunciables.

## 13. Modificaciones

Podemos actualizar estos términos. La versión vigente, con su número y fecha, siempre está publicada en la plataforma. Un cambio sustancial se avisa con quince (15) días de anticipación; si no estás de acuerdo, puedes terminar tu plan y te devolvemos la parte no usada.

## 14. Atención al consumidor, ley y jurisdicción

Peticiones, quejas y reclamos: {{tenant.email}} o WhatsApp {{tenant.whatsapp}}; respondemos en máximo quince (15) días hábiles. Estos términos se rigen por la ley colombiana y las controversias se someten a los jueces de {{tenant.city}}, sin perjuicio de la competencia de la Superintendencia de Industria y Comercio en materia de protección al consumidor y de datos personales.`;

const TERMS_EN = `## 1. Who we are

{{tenant.legalName}} ("{{tenant.name}}", "the studio", "we"), tax ID (NIT) {{tenant.nit}}, registered at {{tenant.address}}, {{tenant.city}}, Colombia, runs a wellness centre and the digital platform you use to book and pay for classes. Write to us at {{tenant.email}} or on WhatsApp at {{tenant.whatsapp}}.

## 2. What you accept by using the platform

By creating an account, booking a class or buying a plan you accept these terms, the Privacy policy, the Liability waiver and the House rules. If you disagree with any of them, do not use the platform and do not enter the room.

You must be 18 or older to open an account. Between 14 and 18 you may practise with written authorisation from a parent or legal guardian, who also signs the waiver.

## 3. Your account

The details you register must be true and current — especially your phone, your email and your emergency contact. Your account is personal and non-transferable: entry to the room is validated against the booking in your name. You are responsible for activity carried out with your credentials; tell us immediately if you suspect misuse.

## 4. Passes, packs and memberships

- Prices are published in Colombian pesos (COP) and include VAT where applicable. The price that governs is the one shown on the platform at the time of purchase.
- **Passes and packs** grant a number of classes with an express validity period. Classes not used within that period lapse and are neither refunded nor transferred, except as set out in the Cancellation policy.
- **Memberships** renew automatically. We notify you {{policy.chargeNoticeDays}} days before each charge. You can cancel the renewal at any time in the app; you keep access until the end of the period already paid.
- You may **pause** a membership for up to {{policy.pauseDaysPerYear}} days per year, across at most {{policy.maxPausesPerYear}} pauses; the renewal date shifts by the paused days.
- Plans are personal. They are not shared, resold or assigned. Misuse allows the studio to suspend the plan without refunding the remaining balance.

## 5. Booking, capacity and attendance

The room holds {{tenant.mats}} mats and {{tenant.perPersonPerDay}} class per person per day. A booking is confirmed when the spot is taken on the platform.

- You can cancel free of charge until **{{policy.cancellationHours}} hours** before the start; inside that window the class is consumed. The detail is in the Cancellation policy, which forms part of these terms.
- When a spot opens, the first person on the waitlist has **{{policy.waitlistClaimMin}} minutes** to claim it.
- Arrive in time: **{{policy.lateGraceMin}} minutes** after the start, entry is no longer allowed — for safety and out of respect for the class in progress.

## 6. Payments

Electronic payments (card, PSE, Nequi) are processed through our payment gateway; the studio does not store your full card number. We also accept cash and bank transfer at the front desk. A declined payment confirms neither the purchase nor the booking.

Electronic invoices are issued under the DIAN rules in force and sent to your registered email.

## 7. Right of withdrawal and payment reversal

Under article 47 of Ley 1480 de 2011 (Colombian Consumer Statute), for purchases made electronically you have a right of withdrawal within **five (5) business days** of the purchase, provided you have not started using the service (that is, you have not taken any class from the plan). You may also request a payment reversal in the cases of article 51 of the same law. The procedure is in the Refund policy.

## 8. Schedule changes

We may change the teacher, the room or the time, or cancel a class for force majeure, maintenance, weather or insufficient attendance. If the studio cancels, we return the class to your balance or, at your choice, your money. We notify you on WhatsApp, by email and in the app.

## 9. Conduct and continued membership

The House rules form part of these terms. The studio may refuse entry or end the relationship, refunding the unused portion pro rata, in the face of conduct that endangers the safety or the calm of the room, harassment, discrimination, or repeated breach of the rules.

## 10. Using the space for photo, video and events

Renting the space for shoots, workshops or events is governed by a separate quote and contract. Inside the room nobody is filmed or photographed without their express consent.

## 11. Intellectual property

The brand, the name, the platform design, the class sequences and the content belong to {{tenant.legalName}} or its licensors. They may not be reproduced for commercial purposes without written authorisation.

## 12. Liability

Physical practice carries risk; you accept it in the Liability waiver. Except for wilful misconduct or gross negligence, the studio's liability is limited to the amount paid for the affected service. Nothing here limits the consumer rights that Colombian law declares non-waivable.

## 13. Changes

We may update these terms. The version in force, with its number and date, is always published on the platform. A material change is announced fifteen (15) days in advance; if you disagree, you may end your plan and we refund the unused part.

## 14. Consumer service, governing law and jurisdiction

Requests, complaints and claims: {{tenant.email}} or WhatsApp {{tenant.whatsapp}}; we answer within fifteen (15) business days at most. These terms are governed by Colombian law and disputes are submitted to the courts of {{tenant.city}}, without prejudice to the powers of the Superintendencia de Industria y Comercio over consumer protection and personal data.`;

// ---------------------------------------------------------------------------------------------
// 2 · Política de privacidad / tratamiento de datos personales
// ---------------------------------------------------------------------------------------------
const PRIVACY_ES = `## 1. Responsable del tratamiento

{{tenant.legalName}}, NIT {{tenant.nit}}, domicilio {{tenant.address}}, {{tenant.city}}, Colombia. Canales de atención: {{tenant.email}} y WhatsApp {{tenant.whatsapp}}.

Esta política se expide en cumplimiento de la **Ley 1581 de 2012**, el **Decreto 1377 de 2013** y las demás normas que regulan el derecho de habeas data en Colombia.

## 2. Qué datos tratamos

- **Identificación y contacto** — nombre, documento, correo, celular, fecha de nacimiento.
- **Contacto de emergencia** — nombre y teléfono de la persona que designas.
- **Datos de salud (sensibles)** — lesiones, embarazo, condiciones cardiovasculares o de presión arterial que declaras voluntariamente.
- **Actividad en el estudio** — reservas, asistencia, lista de espera, reseñas, intención del día.
- **Datos de pago** — plan comprado, valor, medio de pago, factura. *Nunca el número completo de tu tarjeta*: lo custodia la pasarela.
- **Datos técnicos** — dispositivo, idioma, sesión, registros de acceso.
- **Imagen** — fotos o video en clases o eventos, solo con autorización expresa y separada.

## 3. Datos sensibles: son opcionales

Los datos de salud y la imagen son **datos sensibles**. Entregarlos es **facultativo**: no estás obligado a autorizar su tratamiento. Los pedimos con una sola finalidad —cuidarte en la sala y adaptar la práctica— y los tratamos con acceso restringido al personal que necesita conocerlos (profesor de tu clase y coordinación).

## 4. Para qué los usamos

1. Prestar el servicio: cuenta, reservas, cupos, ingreso, historial.
2. Cobrar y facturar, y cumplir obligaciones tributarias y contables.
3. Seguridad de la práctica: atender una urgencia y contactar a tu contacto de emergencia.
4. Comunicaciones del servicio: confirmaciones, recordatorios, cambios y avisos de cobro.
5. Comunicaciones comerciales: novedades, eventos y promociones, **solo con tu autorización**, que puedes retirar en cualquier momento desde la app o respondiendo "SALIR".
6. Mejorar el servicio con datos agregados y estadísticos, que no te identifican.

## 5. Con quién los compartimos

Con encargados que nos prestan servicios y tratan datos solo bajo nuestras instrucciones: alojamiento y base de datos, pasarela de pagos (Colombia), proveedor de WhatsApp Business, proveedor de correo y el proveedor de facturación electrónica. También con autoridades cuando una norma o una orden judicial lo exija. **No vendemos tus datos.**

Algunos proveedores están fuera de Colombia; en ese caso la transferencia se hace con cláusulas contractuales que garantizan un nivel de protección equivalente al de la Ley 1581.

## 6. Cuánto tiempo los conservamos

Mientras tengas una relación activa con el estudio y, después, por el término necesario para atender obligaciones legales: la información contable y tributaria se conserva diez (10) años; la exoneración firmada y los datos de salud, cinco (5) años desde tu última visita; las notificaciones en la app, noventa (90) días.

## 7. Tus derechos

Puedes **conocer, actualizar, rectificar y suprimir** tus datos, **solicitar prueba de la autorización**, ser informado sobre el uso dado a tus datos, **revocar la autorización** y presentar quejas ante la Superintendencia de Industria y Comercio.

Cómo ejercerlos: escribe a {{tenant.email}} con tu nombre, tu solicitud y un dato que permita identificarte. Las consultas se atienden en **diez (10) días hábiles** y los reclamos en **quince (15) días hábiles**, prorrogables conforme a la ley. Algunos derechos los ejerces directamente en la app: editar tu perfil, cambiar tus preferencias de notificación y descargar tu historial.

La supresión no procede cuando exista un deber legal o contractual de conservar el dato (por ejemplo, una factura emitida).

Para **eliminar tu cuenta** tienes dos caminos: en la app, *Perfil → Cuenta y datos*, o la página pública [Eliminar mi cuenta](#/site/delete-account), que no pide iniciar sesión. En ambos casos el perfil y el acceso se eliminan, y las facturas y el historial de pagos se conservan anonimizados por el plazo de la sección 6.

## 8. Seguridad

Aplicamos control de acceso por rol, cifrado en tránsito, registro de auditoría de cada consulta y cambio hecho por el personal, y respaldo periódico. Abrir la ficha de un miembro queda registrado con el nombre de quien la abrió.

## 9. Menores de edad

No abrimos cuentas a menores de 14 años. Entre 14 y 18, el tratamiento requiere autorización del representante legal y responde al interés superior del menor.

## 10. Cookies y analítica

La plataforma usa almacenamiento local del navegador para recordar tu idioma, tu tema y tu sesión. No usamos publicidad de terceros ni rastreo entre sitios.

## 11. Vigencia y cambios

Esta política rige desde su fecha de entrada en vigencia. Cualquier cambio sustancial se avisa por los canales registrados quince (15) días antes de aplicarlo.`;

const PRIVACY_EN = `## 1. Data controller

{{tenant.legalName}}, tax ID (NIT) {{tenant.nit}}, registered at {{tenant.address}}, {{tenant.city}}, Colombia. Contact channels: {{tenant.email}} and WhatsApp {{tenant.whatsapp}}.

This policy is issued under **Ley 1581 de 2012**, **Decreto 1377 de 2013** and the other rules governing the right of habeas data in Colombia.

## 2. What data we process

- **Identity and contact** — name, ID number, email, mobile, date of birth.
- **Emergency contact** — name and phone of the person you name.
- **Health data (sensitive)** — injuries, pregnancy, cardiovascular or blood-pressure conditions you declare voluntarily.
- **Studio activity** — bookings, attendance, waitlist, reviews, intention of the day.
- **Payment data** — plan bought, amount, method, invoice. *Never your full card number*: the gateway holds it.
- **Technical data** — device, language, session, access logs.
- **Image** — photos or video in classes or events, only with express, separate authorisation.

## 3. Sensitive data is optional

Health data and your image are **sensitive data**. Providing them is **optional**: you are not obliged to authorise their processing. We ask for them with a single purpose — to look after you in the room and adapt the practice — and we process them with access restricted to the staff who need to know (your class teacher and the coordinator).

## 4. What we use them for

1. Delivering the service: account, bookings, capacity, entry, history.
2. Charging and invoicing, and meeting tax and accounting obligations.
3. Practice safety: responding to an emergency and reaching your emergency contact.
4. Service messages: confirmations, reminders, changes and charge notices.
5. Marketing messages: news, events and offers, **only with your authorisation**, which you can withdraw at any time in the app or by replying "STOP".
6. Improving the service with aggregated, statistical data that does not identify you.

## 5. Who we share them with

With processors who serve us and handle data only on our instructions: hosting and database, payment gateway (Colombia), WhatsApp Business provider, email provider and the electronic-invoicing provider. Also with authorities where a rule or a court order requires it. **We do not sell your data.**

Some providers are outside Colombia; in that case the transfer is made under contractual clauses guaranteeing a level of protection equivalent to Ley 1581.

## 6. How long we keep them

While you have an active relationship with the studio and, afterwards, for as long as legal obligations require: accounting and tax records for ten (10) years; the signed waiver and health data for five (5) years from your last visit; in-app notifications for ninety (90) days.

## 7. Your rights

You may **access, update, rectify and delete** your data, **request proof of your authorisation**, be informed about the use given to your data, **revoke your authorisation**, and file complaints with the Superintendencia de Industria y Comercio.

How to exercise them: write to {{tenant.email}} with your name, your request and a detail that identifies you. Enquiries are answered within **ten (10) business days** and claims within **fifteen (15) business days**, extendable as the law allows. Some rights you exercise directly in the app: edit your profile, change your notification preferences and download your history.

Deletion does not apply where a legal or contractual duty to keep the record exists (an issued invoice, for example).

To **delete your account** there are two paths: in the app, *Profile → Account & data*, or the public page [Delete my account](#/site/delete-account), which needs no sign-in. In both cases the profile and the access are removed, and invoices and payment history are kept anonymised for the period in section 6.

## 8. Security

We apply role-based access control, encryption in transit, an audit trail of every staff read and change, and periodic backups. Opening a member's record is logged with the name of the person who opened it.

## 9. Minors

We do not open accounts for anyone under 14. Between 14 and 18, processing requires the legal guardian's authorisation and answers to the best interest of the minor.

## 10. Cookies and analytics

The platform uses browser local storage to remember your language, your theme and your session. We use no third-party advertising and no cross-site tracking.

## 11. Term and changes

This policy governs from its effective date. Any material change is announced through your registered channels fifteen (15) days before it applies.`;

// ---------------------------------------------------------------------------------------------
// 3 · Exoneración de responsabilidad y declaración de salud (incluye sala caliente)
// ---------------------------------------------------------------------------------------------
const WAIVER_ES = `> Lee este documento completo antes de tu primera clase. Al aceptarlo declaras que lo entendiste y que estás de acuerdo.

## 1. Naturaleza de la actividad

En {{tenant.name}} se practica movimiento físico: yoga, pilates, barre, flujos dinámicos, clases en **sala caliente**, meditación y respiración. La actividad exige esfuerzo, equilibrio, carga sobre articulaciones y, en algunas clases, exposición a calor y humedad.

## 2. Riesgos que reconozco

Reconozco que, incluso con instrucción calificada y con la sala en buen estado, la práctica implica riesgos que no pueden eliminarse por completo: distensiones y desgarros musculares, lesiones articulares o de columna, caídas, mareo, náusea, deshidratación, calambres, golpe de calor, alteraciones de la presión arterial, desmayo y, en casos extremos, lesiones graves o permanentes. Asumo esos riesgos de forma libre y voluntaria.

## 3. Declaración de salud

Declaro que estoy en condiciones físicas de practicar y que **he informado al estudio** cualquier condición relevante, en particular: cirugías o lesiones recientes, problemas cardíacos, hipertensión o hipotensión, epilepsia, diabetes, asma, vértigo, hernias, lesiones de columna, cuello o rodilla, embarazo o posparto, y medicamentos que afecten la frecuencia cardíaca, el equilibrio o la termorregulación.

Me comprometo a **actualizar esa información** cuando cambie, antes de entrar a la sala.

## 4. Sala caliente: advertencia específica

Las clases marcadas como *hot* se dictan con calor y humedad controlados. **No debo practicar en sala caliente** si estoy embarazada, si tengo una condición cardiovascular o de presión arterial no controlada, si estoy deshidratada o con fiebre, si consumí alcohol en las horas previas, o si un profesional de la salud me lo ha contraindicado.

Entiendo que debo hidratarme antes, durante y después, que puedo salir de la sala en cualquier momento, que salir no requiere permiso ni explicación, y que debo avisar al profesor si siento mareo, visión borrosa, náusea, dolor en el pecho o dejo de sudar.

## 5. Consulta médica

Entiendo que el estudio **no presta servicios médicos** y que sus profesores no diagnostican ni tratan. Si tengo dudas sobre mi aptitud física, consulto a un profesional de la salud antes de practicar.

## 6. Mi responsabilidad en la sala

Me comprometo a practicar dentro de mis límites, a seguir las indicaciones del profesor, a usar el equipo como se me indique, a no forzar una postura que duela y a avisar cuando algo no se siente bien. Entiendo que el ajuste manual es opcional: puedo pedir que no me toquen y mi decisión se respeta sin explicación.

## 7. Urgencias

Autorizo al estudio a prestar primeros auxilios y, si es necesario, a activar el servicio de emergencia y a contactar a la persona que registré como contacto de emergencia. Los costos de atención médica o traslado son a mi cargo o de mi asegurador.

## 8. Objetos personales

El estudio dispone de casilleros de cortesía y no responde por dinero, joyas, equipos electrónicos u objetos dejados en ellos, en los vestieres o en las áreas comunes.

## 9. Exoneración

En la medida permitida por la ley colombiana, exonero a {{tenant.legalName}}, a sus socios, empleados y profesores de responsabilidad por lesiones o daños derivados de la práctica, **salvo** los que provengan de su dolo o culpa grave, del incumplimiento de sus deberes de seguridad o de la falla de sus instalaciones o equipos. Esta exoneración **no limita** los derechos irrenunciables que la ley reconoce al consumidor.

## 10. Menores

Si el practicante es menor de 18 años, su padre, madre o representante legal firma esta exoneración en su nombre y declara conocer y aceptar su contenido.

## 11. Aceptación electrónica

Acepto este documento por medios electrónicos, con el valor probatorio que le otorga la **Ley 527 de 1999**. El estudio guarda la fecha, la hora, la versión aceptada y el canal, y me permite consultarlo en cualquier momento en la app.`;

const WAIVER_EN = `> Read this document in full before your first class. Accepting it means you understood it and you agree.

## 1. Nature of the activity

At {{tenant.name}} we practise physical movement: yoga, pilates, barre, dynamic flows, **heated-room** classes, meditation and breathwork. The activity demands effort, balance, load on the joints and, in some classes, exposure to heat and humidity.

## 2. Risks I acknowledge

I acknowledge that even with qualified instruction and a well-kept room, the practice carries risks that cannot be removed entirely: muscle strains and tears, joint or spinal injury, falls, dizziness, nausea, dehydration, cramps, heat stroke, blood-pressure changes, fainting and, in extreme cases, serious or permanent injury. I accept those risks freely and voluntarily.

## 3. Health declaration

I declare that I am physically fit to practise and that **I have informed the studio** of any relevant condition, in particular: recent surgery or injury, heart conditions, high or low blood pressure, epilepsy, diabetes, asthma, vertigo, hernias, spine, neck or knee injuries, pregnancy or postpartum, and medication affecting heart rate, balance or thermoregulation.

I undertake to **update that information** whenever it changes, before entering the room.

## 4. Heated room: specific warning

Classes marked *hot* are taught with controlled heat and humidity. **I must not practise in the heated room** if I am pregnant, if I have an uncontrolled cardiovascular or blood-pressure condition, if I am dehydrated or feverish, if I have drunk alcohol in the preceding hours, or if a health professional has advised against it.

I understand that I must hydrate before, during and after, that I may leave the room at any time, that leaving needs no permission and no explanation, and that I must tell the teacher if I feel dizziness, blurred vision, nausea, chest pain, or if I stop sweating.

## 5. Medical advice

I understand that the studio **provides no medical services** and that its teachers do not diagnose or treat. If I have doubts about my fitness, I consult a health professional before practising.

## 6. My responsibility in the room

I undertake to practise within my limits, to follow the teacher's instructions, to use equipment as shown, never to force a posture that hurts, and to speak up when something does not feel right. I understand that hands-on adjustment is optional: I may ask not to be touched and my choice is respected without explanation.

## 7. Emergencies

I authorise the studio to give first aid and, if needed, to call emergency services and to contact the person I registered as my emergency contact. The cost of medical care or transport is mine or my insurer's.

## 8. Personal belongings

The studio offers courtesy lockers and is not responsible for money, jewellery, electronics or items left in them, in the changing rooms or in the common areas.

## 9. Waiver

To the extent Colombian law allows, I release {{tenant.legalName}}, its partners, employees and teachers from liability for injury or damage arising from the practice, **except** where it arises from their wilful misconduct or gross negligence, from a breach of their safety duties, or from a failure of their facilities or equipment. This waiver **does not limit** the non-waivable consumer rights the law grants me.

## 10. Minors

Where the practitioner is under 18, a parent or legal guardian signs this waiver on their behalf and declares that they know and accept its content.

## 11. Electronic acceptance

I accept this document electronically, with the evidential value granted by **Ley 527 de 1999**. The studio stores the date, the time, the version accepted and the channel, and lets me read it at any time in the app.`;

// ---------------------------------------------------------------------------------------------
// 4 · Política de cancelaciones (numbers from M-08, live) — 0051: the verified launch rules
// ---------------------------------------------------------------------------------------------
const CANCEL_ES = `> Los números de esta política se leen en vivo de la configuración del estudio. Si cambian, este texto cambia con ellos.

## 1. La regla, en una línea

Puedes cancelar tu reserva **hasta {{policy.cancellationHours}} horas antes** del inicio de la clase.

## 2. Reservar

No hay un tiempo mínimo para reservar: puedes reservar una clase hasta el último minuto, siempre que haya cupos disponibles. La sala tiene {{tenant.mats}} mats.

## 3. Cómo se aplica

- **Hasta {{policy.cancellationHours}} h antes** — la clase vuelve a tu paquete.
- **Después de esa hora** — la clase se usa.
- **No llegas (no-show)** — no hay reembolso: la clase se usa{{policy.noShowFeeClause}}. Si no viniste por enfermedad, reprogramamos tu clase.
- **Llegas más de {{policy.lateGraceMin}} min tarde** — no se permite el ingreso; la clase se usa.

El check-in se hace únicamente en recepción, al llegar.

## 4. Lista de espera

Si la clase está llena puedes entrar a la lista de espera. Cuando se libera un cupo te escribimos y tienes **{{policy.waitlistClaimMin}} minutos** para reclamarlo; pasado ese tiempo pasa a la siguiente persona.

## 5. Cuando el estudio cambia o cancela una clase

Si cancelamos una clase, la clase vuelve a tu paquete de inmediato y te avisamos. Los cambios de programación los publicamos en el calendario de clases; si tienes dudas, escríbenos por WhatsApp {{tenant.whatsapp}} o a {{tenant.email}}.

## 6. El paquete de 12 clases

Tiene una vigencia de 3 meses y no es reembolsable. Lo puedes **congelar {{policy.freezesPerPackage}} vez**, hasta por **{{policy.freezeMaxDays}} días**; la fecha de vencimiento se corre por los días congelados.

> **Por definir:** qué pasa si cancelas con menos de {{policy.cancellationHours}} horas de anticipación más allá de usar la clase, y cómo se informa o se soporta una ausencia por enfermedad.`;

const CANCEL_EN = `> The numbers in this policy are read live from the studio's settings. If they change, this text changes with them.

## 1. The rule, in one line

You can cancel your booking **up to {{policy.cancellationHours}} hours before** the class starts.

## 2. Booking

There is no minimum time to book: you can book a class up to the last minute, as long as there are spots available. The room holds {{tenant.mats}} mats.

## 3. How it applies

- **Up to {{policy.cancellationHours}} h before** — the class returns to your package.
- **After that** — the class counts as used.
- **You do not come (no-show)** — no refund: the class counts as used{{policy.noShowFeeClause}}. If you missed it because you were sick, we reschedule your class.
- **You arrive more than {{policy.lateGraceMin}} min late** — entry is not allowed; the class counts as used.

Check-in happens only at the front desk, when you arrive.

## 4. Waitlist

If the class is full you can join the waitlist. When a spot opens we message you and you have **{{policy.waitlistClaimMin}} minutes** to claim it; after that it passes to the next person.

## 5. When the studio changes or cancels a class

If we cancel a class, the class returns to your package immediately and we let you know. Schedule changes are published on the class calendar; if in doubt, write to us on WhatsApp {{tenant.whatsapp}} or at {{tenant.email}}.

## 6. The 12-class package

It is valid for 3 months and is non-refundable. You can **freeze it {{policy.freezesPerPackage}} time**, for up to **{{policy.freezeMaxDays}} days**; the expiry date moves by the frozen days.

> **To be defined:** what happens when you cancel less than {{policy.cancellationHours}} hours ahead beyond the class counting as used, and how an absence through illness is reported or supported.`;

// ---------------------------------------------------------------------------------------------
// 5 · Política de reembolsos — 0051: what the owner has decided, and what is still to be defined
// ---------------------------------------------------------------------------------------------
const REFUND_ES = `## 1. Alcance

Esta política explica cuándo hay devolución de dinero. Complementa los Términos y condiciones y la Política de cancelaciones, y no limita los derechos que la **Ley 1480 de 2011** reconoce al consumidor.

## 2. Lo que ya está definido

- El **paquete de 12 clases** no es reembolsable.
- Si no asistes a una clase reservada (no-show), **no hay reembolso**. Si no asististe por enfermedad, reprogramamos tu clase.
- Las **tarjetas de regalo** se compran al mismo precio de las clases y se usan como clases.

> **Por definir:** el derecho de retracto (plazo, condiciones y procedimiento), la reversión del pago (casos en los que aplica y cómo se pide) y la política de reembolsos completa.

## 3. Cómo escribirnos

Escribe a {{tenant.email}} o por WhatsApp {{tenant.whatsapp}} con tu nombre, la compra (la encuentras en *Historial → Pagos*) y el motivo.

## 4. Si no estás de acuerdo

Puedes insistir con nosotros —lo revisamos con gusto— y en cualquier momento acudir a la **Superintendencia de Industria y Comercio**.`;

const REFUND_EN = `## 1. Scope

This policy explains when money is returned. It complements the Terms & conditions and the Cancellation policy, and does not limit the rights **Ley 1480 de 2011** grants consumers.

## 2. What is already decided

- The **12-class package** is non-refundable.
- If you do not attend a booked class (no-show), **there is no refund**. If you missed it because you were sick, we reschedule your class.
- **Gift cards** are bought at the same price as the classes and are used as classes.

> **To be defined:** the right of withdrawal (period, conditions and procedure), payment reversal (when it applies and how to ask for it) and the full refund policy.

## 3. How to write to us

Write to {{tenant.email}} or on WhatsApp {{tenant.whatsapp}} with your name, the purchase (you will find it in *History → Payments*) and the reason.

## 4. If you disagree

You can press the point with us — we are glad to review it — and you may at any time go to the **Superintendencia de Industria y Comercio**.`;

// ---------------------------------------------------------------------------------------------
// 1b · Términos y Condiciones v2.0 — 0051: the owner's document ("Términos y Condiciones · HOY Human Club",
// 2026-10-01). What it marks "por definir" (in yellow in the draft) renders as a highlighted callout.
// ---------------------------------------------------------------------------------------------
const TERMS2_ES = `> Borrador del estudio. Lo marcado como **Por definir** se completa antes de la versión final.

## 1. Quiénes somos

{{tenant.name}} es un espacio de movimiento y bienestar en El Poblado, Medellín, Colombia. A través del Método {{tenant.name}} reunimos diferentes metodologías de entrenamiento y movimiento, para que entrenes, te muevas y disfrutes el presente, en comunidad.

{{tenant.name}} opera el espacio físico y la plataforma digital. Desde la plataforma puedes consultar clases, reservar y pagar.

- **Dirección:** {{tenant.address}} — {{tenant.landmark}}.
- **Correo electrónico:** {{tenant.email}}
- **WhatsApp:** {{tenant.whatsapp}}
- **Instagram:** {{tenant.instagram}}

## 2. Qué aceptas al usar la plataforma

Al crear una cuenta, comprar un paquete, reservar una clase o usar cualquier servicio de {{tenant.name}}, aceptas estos Términos y Condiciones. También aceptas la Política de Privacidad, la Exoneración de Responsabilidad y las Reglas de Casa vigentes.

> **Por definir:**
> - Edad mínima para crear una cuenta.
> - Condiciones para menores de edad.

## 3. Tu cuenta

- La información que registres debe ser verdadera, completa y estar actualizada.
- Tu cuenta es personal. Solo tú puedes usarla.
- Cada reserva queda asociada a la persona que la hace.
- El check-in se hace únicamente en recepción, antes de entrar a la clase.

> **Por definir:**
> - Política sobre cuentas compartidas, credenciales y uso indebido.

## 4. Clases, paquetes y precios

Para el lanzamiento, {{tenant.name}} ofrece estas opciones (precios de lanzamiento, en pesos colombianos):

- **Clase de prueba:** {{price.trial}}
- **Clase individual:** {{price.single}}
- **Paquete de 12 clases:** {{price.pack12}}
- **Paquete de 12 clases para afiliados de Santa María Tennis Club:** {{price.pack12_smtc}}
- **Clase privada (máximo 3 personas):** {{price.private}}
- **Persona adicional en clase privada:** {{price.private_extra}}

**Paquete de 12 clases**

- Tiene una vigencia de 3 meses.
- No es reembolsable.
- Puedes congelarlo una sola vez, por un máximo de {{policy.freezeMaxDays}} días.

**Afiliados de Santa María Tennis Club**

El precio especial del paquete de 12 clases es el único beneficio entre Santa María Tennis Club y {{tenant.name}}.

**Tarjetas de regalo**

Puedes comprar una clase individual o un paquete de 12 clases como tarjeta de regalo, al mismo precio. Una persona puede comprar varias clases individuales, o dos o más paquetes de 12 clases.

**Créditos**

{{tenant.name}} no maneja un sistema de créditos.

> **Por definir:**
> - Precios definitivos después del lanzamiento.
> - Vigencia de las tarjetas de regalo.

## 5. Reservas, cancelaciones y no-show

- Puedes reservar una clase sin un tiempo mínimo de anticipación, siempre que haya cupos disponibles.
- Puedes cancelar tu reserva hasta {{policy.cancellationHours}} horas antes del inicio de la clase.
- Si no asistes a una clase reservada (no-show), no hay reembolso.
- Si no asististe por enfermedad, reprogramamos tu clase.

> **Por definir:**
> - Qué pasa si cancelas con menos de {{policy.cancellationHours}} horas de anticipación.
> - Cómo se informa o se soporta una ausencia por enfermedad.

## 6. Pagos

- En la página web puedes pagar con Wompi, código QR y PSE.
- En recepción hay diferentes medios de pago, incluido el efectivo.

## 7. Derecho de retracto y reversión del pago

El paquete de 12 clases tiene una vigencia de 3 meses y no es reembolsable.

> **Por definir:**
> - Derecho de retracto: plazo, condiciones y procedimiento para ejercerlo.
> - Reversión del pago: casos en los que aplica y procedimiento para solicitarla.
> - Política de reembolsos completa.

## 8. Cambios en la programación

{{tenant.name}} cuenta con diferentes profesores, metodologías y horarios, que pueden variar según la programación vigente. La información actualizada de clases, profesores y horarios está en el calendario de clases de la página web.

Si hay cambios o cancelaciones, escríbenos:

- **WhatsApp Business:** {{tenant.whatsapp}}
- **Correo electrónico:** {{tenant.email}}

## 9. Conducta y permanencia

{{tenant.name}} tendrá unas Reglas de Casa para que la experiencia sea segura, respetuosa y agradable para todas las personas de la comunidad.

> **Por definir:**
> - Reglas de Casa definitivas.
> - Causales para negar el ingreso al estudio.
> - Causales para suspender un plan.
> - Causales para finalizar la relación con un usuario.
> - Política frente a conductas que afecten la seguridad o tranquilidad de otros usuarios.
> - Política frente al acoso o la discriminación.
> - Devolución proporcional del saldo no utilizado en caso de terminación por conducta.

## 10. Uso del espacio para fotos, video y eventos

{{tenant.name}} ofrece el alquiler del espacio para experiencias y actividades especiales. Cada solicitud se analiza de forma individual, y su valor depende de las características y necesidades de cada caso.

{{tenant.name}} ofrece experiencias corporativas desde el lanzamiento.

> **Por definir:**
> - Contrato específico para rodajes, talleres o eventos.
> - Política para tomar fotografías dentro del estudio.
> - Política para grabar videos dentro del estudio.
> - Consentimiento para fotografiar o grabar a otros usuarios.

## 11. Propiedad intelectual

{{tenant.name}} cuenta con el Método {{tenant.name}}, bajo el cual se organizan sus diferentes experiencias y metodologías de entrenamiento.

> **Por definir:**
> - Titularidad legal de la marca.
> - Protección y condiciones de uso del Método {{tenant.name}}.
> - Propiedad de las secuencias y metodologías de clase.
> - Derechos sobre fotografías, videos, textos y demás contenidos.
> - Derechos sobre el diseño y el contenido de la plataforma.
> - Autorización para reproducir o usar comercialmente el contenido.

## 12. Responsabilidad

{{tenant.name}} tendrá una Exoneración de Responsabilidad asociada a la práctica de las actividades físicas y experiencias que ofrece en el estudio.

> **Por definir:**
> - Contenido definitivo de la Exoneración de Responsabilidad.
> - Aceptación de los riesgos asociados a la actividad física.
> - Responsabilidad frente a lesiones o accidentes.
> - Limitaciones de responsabilidad.
> - Procedimiento en caso de accidente o emergencia dentro del estudio.

## 13. Modificaciones de los Términos y Condiciones

> **Por definir:**
> - Facultad para modificar o actualizar estos Términos y Condiciones.
> - Publicación de la versión vigente en la plataforma.
> - Identificación de cada versión con fecha o número.
> - Plazo de aviso previo ante cambios importantes.
> - Canal para comunicar las modificaciones.
> - Posibilidad de finalizar un plan si no estás de acuerdo con un cambio importante, y devolución del saldo no utilizado en ese caso.

## 14. Atención al consumidor, ley y jurisdicción

Puedes contactarnos por estos canales:

- **Correo electrónico:** {{tenant.email}}
- **WhatsApp Business:** {{tenant.whatsapp}}
- **Instagram:** {{tenant.instagram}}

> **Por definir:**
> - Canal específico para peticiones, quejas y reclamos (PQR).
> - Tiempo máximo de respuesta a las PQR.
> - Legislación aplicable.
> - Jurisdicción para resolver controversias.
> - Procedimiento para reclamaciones ante las autoridades de protección al consumidor.`;

const TERMS2_EN = `> The studio's draft. Items marked **To be defined** are completed before the final version.

## 1. Who we are

{{tenant.name}} is a space for movement and wellbeing in El Poblado, Medellín, Colombia. Through the {{tenant.name}} Method we bring together different training and movement methodologies, so you train, move and enjoy the present, in community.

{{tenant.name}} runs the physical space and the digital platform. On the platform you can look up classes, book and pay.

- **Address:** {{tenant.address}} — {{tenant.landmark}}.
- **Email:** {{tenant.email}}
- **WhatsApp:** {{tenant.whatsapp}}
- **Instagram:** {{tenant.instagram}}

## 2. What you accept when you use the platform

When you create an account, buy a package, book a class or use any {{tenant.name}} service, you accept these Terms and Conditions. You also accept the Privacy Policy, the Liability Waiver and the House Rules in force.

> **To be defined:**
> - Minimum age to create an account.
> - Conditions for minors.

## 3. Your account

- The information you register must be true, complete and up to date.
- Your account is personal. Only you can use it.
- Each booking belongs to the person who makes it.
- Check-in happens only at the front desk, before entering the class.

> **To be defined:**
> - Policy on shared accounts, credentials and misuse.

## 4. Classes, packages and prices

For the launch, {{tenant.name}} offers these options (launch prices, in Colombian pesos):

- **Trial class:** {{price.trial}}
- **Individual class:** {{price.single}}
- **12-class package:** {{price.pack12}}
- **12-class package for Santa María Tennis Club affiliates:** {{price.pack12_smtc}}
- **Private class (maximum 3 people):** {{price.private}}
- **Additional person in a private class:** {{price.private_extra}}

**12-class package**

- It is valid for 3 months.
- It is non-refundable.
- You can freeze it once, for up to {{policy.freezeMaxDays}} days.

**Santa María Tennis Club affiliates**

The special price on the 12-class package is the only benefit between Santa María Tennis Club and {{tenant.name}}.

**Gift cards**

You can buy an individual class or a 12-class package as a gift card, at the same price. One person can buy several individual classes, or two or more 12-class packages.

**Credits**

{{tenant.name}} does not run a credit system.

> **To be defined:**
> - Final prices after the launch.
> - Validity of gift cards.

## 5. Booking, cancellation and no-show

- You can book a class with no minimum notice, as long as there are spots available.
- You can cancel your booking up to {{policy.cancellationHours}} hours before the class starts.
- If you do not attend a booked class (no-show), there is no refund.
- If you missed it because you were sick, we reschedule your class.

> **To be defined:**
> - What happens if you cancel less than {{policy.cancellationHours}} hours ahead.
> - How an absence through illness is reported or supported.

## 6. Payments

- On the website you can pay with Wompi, a QR code and PSE.
- At the front desk there are several payment methods, cash included.

## 7. Right of withdrawal and payment reversal

The 12-class package is valid for 3 months and is non-refundable.

> **To be defined:**
> - Right of withdrawal: period, conditions and procedure.
> - Payment reversal: when it applies and how to request it.
> - The full refund policy.

## 8. Schedule changes

{{tenant.name}} has different teachers, methodologies and schedules, which may change with the schedule in force. The current classes, teachers and times are on the class calendar on the website.

If there are changes or cancellations, write to us:

- **WhatsApp Business:** {{tenant.whatsapp}}
- **Email:** {{tenant.email}}

## 9. Conduct and membership of the community

{{tenant.name}} will have House Rules so the experience is safe, respectful and pleasant for everyone in the community.

> **To be defined:**
> - The final House Rules.
> - Grounds for refusing entry to the studio.
> - Grounds for suspending a plan.
> - Grounds for ending the relationship with a user.
> - Policy on behaviour that affects other users' safety or peace.
> - Policy on harassment or discrimination.
> - Pro-rata refund of the unused balance when ended for conduct.

## 10. Using the space for photos, video and events

{{tenant.name}} rents the space for experiences and special activities. Each request is reviewed on its own, and its price depends on what each case involves and needs.

{{tenant.name}} offers corporate experiences from the launch.

> **To be defined:**
> - A specific contract for shoots, workshops or events.
> - Policy on taking photographs in the studio.
> - Policy on recording video in the studio.
> - Consent to photograph or record other users.

## 11. Intellectual property

{{tenant.name}} has the {{tenant.name}} Method, under which its experiences and training methodologies are organised.

> **To be defined:**
> - Legal ownership of the brand.
> - Protection and terms of use of the {{tenant.name}} Method.
> - Ownership of class sequences and methodologies.
> - Rights over photographs, videos, texts and other content.
> - Rights over the platform's design and content.
> - Authorisation to reproduce or commercially use the content.

## 12. Liability

{{tenant.name}} will have a Liability Waiver for the physical activities and experiences it offers at the studio.

> **To be defined:**
> - The final content of the Liability Waiver.
> - Acceptance of the risks of physical activity.
> - Liability for injuries or accidents.
> - Limits of liability.
> - Procedure for an accident or emergency in the studio.

## 13. Changes to these Terms and Conditions

> **To be defined:**
> - The power to change or update these Terms and Conditions.
> - Publication of the version in force on the platform.
> - Identifying each version by date or number.
> - Notice period before important changes.
> - The channel used to announce changes.
> - Ending a plan if you do not agree with an important change, and refunding the unused balance in that case.

## 14. Consumer service, law and jurisdiction

You can reach us through these channels:

- **Email:** {{tenant.email}}
- **WhatsApp Business:** {{tenant.whatsapp}}
- **Instagram:** {{tenant.instagram}}

> **To be defined:**
> - A specific channel for requests, complaints and claims (PQR).
> - Maximum response time for PQR.
> - Applicable law.
> - Jurisdiction for disputes.
> - Procedure for claims before the consumer-protection authorities.`;


// ---------------------------------------------------------------------------------------------
// 6 · Reglas de casa
// ---------------------------------------------------------------------------------------------
const HOUSE_ES = `> No son normas de urbanidad: son los acuerdos que hacen que {{tenant.mats}} personas quepan bien en una sala.

## 1. El tiempo

Llega **10 minutos antes**. La puerta de la sala se cierra al empezar y, pasados **{{policy.lateGraceMin}} minutos**, no se permite el ingreso: entrar tarde interrumpe la clase y el calentamiento existe por una razón. Si sabes que no vas a llegar, cancela con {{policy.cancellationHours}} horas y libera el cupo.

## 2. El cuerpo

Cuéntale al profesor de tus lesiones, tu embarazo o tu cansancio antes de empezar. Practica dentro de tus límites; salir de una postura no es fracasar. Si no quieres ajustes manuales, dilo o dale la vuelta a la tarjeta de la recepción: nadie te va a preguntar por qué.

## 3. El silencio

La sala empieza en silencio y termina en silencio. Las conversaciones, en el lounge. El celular se queda afuera o en modo avión: si tienes que estar disponible por una razón real, cuéntanoslo y te ubicamos cerca de la puerta.

## 4. El calor

En las clases *hot* hidrátate antes, durante y después. Puedes salir de la sala cuando quieras, sin pedir permiso. Si sientes mareo, náusea, dolor en el pecho o dejas de sudar, sal y avísale al profesor. Lee la Exoneración de responsabilidad: hay condiciones en las que la sala caliente no es para ti.

## 5. La sala

Entra descalzo. Trae tu toalla; los mats, bloques y cinturones son del estudio y se limpian al terminar. Deja tu espacio como lo encontraste. Los perfumes fuertes no funcionan en una sala compartida.

## 6. Las cosas

Casilleros de cortesía en el vestier; el candado lo traes tú. No respondemos por objetos de valor. Lo que se queda se guarda **30 días** en objetos perdidos.

## 7. Las otras personas

No se fotografía ni se graba a nadie dentro de la sala sin su permiso expreso, ni antes ni después de la clase. Cero tolerancia con el acoso, los comentarios sobre el cuerpo de otra persona y la discriminación por género, orientación, origen, religión, edad o condición física. Una sola vez basta para pedirte que te vayas.

## 8. Los invitados

Tu invitado firma la exoneración y reserva su cupo como cualquier otra persona: la capacidad es física, no administrativa.

## 9. Los niños y las mascotas

Los menores de 14 años no practican y no se quedan solos en el lounge. Las mascotas no entran a la sala; en el lounge, solo animales de asistencia.

## 10. Alcohol, comida y sustancias

No se practica bajo efectos del alcohol o de sustancias psicoactivas. Come ligero y **al menos dos horas antes**. Solo agua dentro de la sala.

## 11. Cuando algo no está bien

Un mat roto, una gotera, un olor, una persona incómoda: dilo en recepción o escríbenos a WhatsApp {{tenant.whatsapp}}. No hay queja pequeña; lo que no nos dices no lo podemos arreglar.

## 12. Consecuencias

Incumplir estas reglas puede significar que te pidamos salir de la clase y, si se repite, terminar tu plan devolviéndote la parte no usada, como dicen los Términos y condiciones.`;

const HOUSE_EN = `> These are not manners: they are the agreements that let {{tenant.mats}} people share one room well.

## 1. Time

Arrive **10 minutes early**. The room door closes at the start and, **{{policy.lateGraceMin}} minutes** in, entry is no longer allowed: coming in late interrupts the class, and the warm-up exists for a reason. If you know you will not make it, cancel {{policy.cancellationHours}} hours ahead and free the spot.

## 2. Your body

Tell the teacher about injuries, pregnancy or tiredness before you start. Practise within your limits; coming out of a posture is not failing. If you would rather not be adjusted by hand, say so or turn over the card at the desk: nobody will ask why.

## 3. Quiet

The room starts in silence and ends in silence. Conversations belong in the lounge. Phones stay outside or on airplane mode; if you genuinely must be reachable, tell us and we will place you near the door.

## 4. Heat

In *hot* classes, hydrate before, during and after. You may leave the room whenever you like, without asking. If you feel dizziness, nausea, chest pain, or you stop sweating, step out and tell the teacher. Read the Liability waiver: there are conditions under which the heated room is not for you.

## 5. The room

Come in barefoot. Bring your towel; mats, blocks and straps belong to the studio and are cleaned after class. Leave your space as you found it. Strong perfume does not work in a shared room.

## 6. Your things

Courtesy lockers in the changing room; bring your own padlock. We are not responsible for valuables. Anything left behind is kept in lost property for **30 days**.

## 7. Other people

Nobody is photographed or filmed inside the room without their express permission, before or after class. Zero tolerance for harassment, comments about anyone's body, and discrimination on grounds of gender, orientation, origin, religion, age or physical condition. Once is enough for us to ask you to leave.

## 8. Guests

Your guest signs the waiver and books a spot like anybody else: capacity is physical, not administrative.

## 9. Children and pets

Under-14s do not practise and are not left alone in the lounge. Pets do not enter the room; in the lounge, assistance animals only.

## 10. Alcohol, food and substances

Nobody practises under the influence of alcohol or psychoactive substances. Eat light and **at least two hours before**. Water only inside the room.

## 11. When something is wrong

A torn mat, a leak, a smell, someone who made you uncomfortable: say it at the desk or write to WhatsApp {{tenant.whatsapp}}. No complaint is too small; what you do not tell us we cannot fix.

## 12. Consequences

Breaking these rules can mean we ask you to leave the class and, if it repeats, that we end your plan and refund the unused part, as the Terms & conditions say.`;

// ---------------------------------------------------------------------------------------------

const DRAFTS: Draft[] = [
  {
    id: 'leg_terms_es', kind: 'terms', version: '1.0', status: 'published', requiresAcceptance: true, monthsOld: 8,
    title: { es: 'Términos y condiciones', en: 'Terms & conditions' },
    summary: { es: 'Qué aceptas al reservar, pagar y practicar con nosotros.', en: 'What you accept when you book, pay and practise with us.' },
    body: { es: TERMS_ES, en: TERMS_EN },
  },
  {
    // 0051 — the owner's Términos y Condiciones (v2.0) replace the studio's first draft (v1.0, kept as history).
    id: 'leg_terms_20', kind: 'terms', version: '2.0', status: 'published', requiresAcceptance: true, monthsOld: 0,
    title: { es: 'Términos y Condiciones', en: 'Terms and Conditions' },
    summary: { es: 'Quiénes somos, tu cuenta, clases, paquetes y precios de lanzamiento, reservas, cancelaciones, pagos y lo que aún está por definir.', en: 'Who we are, your account, classes, packages and launch prices, booking, cancellation, payments and what is still to be defined.' },
    body: { es: TERMS2_ES, en: TERMS2_EN },
  },
  {
    id: 'leg_privacy_es', kind: 'privacy', version: '1.0', status: 'published', requiresAcceptance: true, monthsOld: 8,
    title: { es: 'Política de privacidad', en: 'Privacy policy' },
    summary: { es: 'Qué datos tratamos, para qué, con quién y cómo ejerces tus derechos (Ley 1581 de 2012).', en: 'What data we process, why, with whom, and how you exercise your rights (Ley 1581 de 2012).' },
    body: { es: PRIVACY_ES, en: PRIVACY_EN },
  },
  {
    id: 'leg_waiver_10', kind: 'waiver', version: '1.0', status: 'published', requiresAcceptance: true, monthsOld: 8,
    title: { es: 'Exoneración de responsabilidad y declaración de salud', en: 'Liability waiver & health declaration' },
    summary: { es: 'Riesgos de la práctica, declaración de salud y la advertencia de sala caliente.', en: 'Practice risks, health declaration and the heated-room warning.' },
    body: { es: WAIVER_ES, en: WAIVER_EN },
  },
  {
    id: 'leg_waiver_11', kind: 'waiver', version: '1.1', status: 'draft', requiresAcceptance: true, monthsOld: 0,
    title: { es: 'Exoneración de responsabilidad y declaración de salud', en: 'Liability waiver & health declaration' },
    summary: { es: 'Revisión 1.1: sala caliente como sección propia y aceptación electrónica (Ley 527 de 1999).', en: 'Revision 1.1: the heated room as its own section and electronic acceptance (Ley 527 de 1999).' },
    body: {
      es: `> Versión 1.1 — en revisión con el abogado. La versión vigente sigue siendo la 1.0 hasta que el estudio publique esta.\n\n${WAIVER_ES}\n\n## 12. Cambios frente a la versión 1.0\n\n- La advertencia de sala caliente pasa a ser una sección propia, con la lista de contraindicaciones.\n- Se explicita que salir de la sala no requiere permiso ni explicación.\n- Se añade la cláusula de aceptación electrónica con el valor probatorio de la Ley 527 de 1999.\n- Se aclara que la exoneración no cubre el dolo ni la culpa grave del estudio, ni limita derechos irrenunciables del consumidor.`,
      en: `> Version 1.1 — under review with counsel. Version 1.0 remains in force until the studio publishes this one.\n\n${WAIVER_EN}\n\n## 12. Changes from version 1.0\n\n- The heated-room warning becomes its own section, with the list of contraindications.\n- It is made explicit that leaving the room needs no permission and no explanation.\n- An electronic-acceptance clause is added, with the evidential value of Ley 527 de 1999.\n- It is clarified that the waiver covers neither wilful misconduct nor gross negligence by the studio, and does not limit non-waivable consumer rights.`,
    },
  },
  {
    id: 'leg_cancellation_10', kind: 'cancellation', version: '1.0', status: 'draft', monthsOld: 0,
    title: { es: 'Política de cancelaciones', en: 'Cancellation policy' },
    summary: { es: 'La ventana de cancelación, reservar sin tiempo mínimo, la lista de espera, el no-show y el congelamiento del paquete.', en: 'The cancellation window, booking with no minimum notice, the waitlist, no-shows and the package freeze.' },
    body: { es: CANCEL_ES, en: CANCEL_EN },
  },
  {
    id: 'leg_refunds_10', kind: 'refunds', version: '1.0', status: 'draft', monthsOld: 0,
    title: { es: 'Política de reembolsos', en: 'Refund policy' },
    summary: { es: 'Lo que ya está definido (el paquete no es reembolsable, el no-show) y lo que está por definir (retracto, reversión del pago).', en: 'What is decided (the package is non-refundable, no-shows) and what is to be defined (withdrawal, payment reversal).' },
    body: { es: REFUND_ES, en: REFUND_EN },
  },
  {
    id: 'leg_house_rules_10', kind: 'house-rules', version: '1.0', status: 'draft', monthsOld: 0,
    title: { es: 'Reglas de casa', en: 'House rules' },
    summary: { es: 'Los acuerdos de la sala: tiempo, silencio, calor, cuerpo y respeto.', en: 'The room’s agreements: time, quiet, heat, body and respect.' },
    body: { es: HOUSE_ES, en: HOUSE_EN },
  },
];

/** The legal library, newest version of each kind last. */
export const legalDocuments: LegalDocumentRow[] = DRAFTS.map((d) => {
  const from = monthsAgo(d.monthsOld);
  return {
    ...base(d.id, d.monthsOld * 30 + 2),
    kind: d.kind,
    slug: `${d.kind}-${d.version}`,
    version: d.version,
    status: d.status,
    effective_from: dateKey(from),
    title: d.title,
    summary: d.summary,
    body_md: d.body,
    requires_acceptance: !!d.requiresAcceptance,
    published_at: d.status === 'published' ? iso(from) : null,
  } as LegalDocumentRow;
});

/** The version of `kind` that governs today (published, latest effective date). */
export const currentLegal = (kind: LegalDocumentRow['kind']) =>
  legalDocuments.filter((d) => d.kind === kind && d.status === 'published').sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
  ?? legalDocuments.filter((d) => d.kind === kind).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
