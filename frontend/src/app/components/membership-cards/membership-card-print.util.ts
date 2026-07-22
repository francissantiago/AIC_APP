import { MemberMaritalStatus } from '@enums/member-marital-status';
import { IMembershipCard } from '@interfaces/IMembershipCard';

export interface IMembershipCardPrintLabels {
  cardLabel: string;
  fieldName: string;
  fieldFiliation: string;
  fieldBirthDate: string;
  fieldPlaceOfBirth: string;
  fieldPosition: string;
  fieldBloodType: string;
  fieldRegistration: string;
  fieldCpf: string;
  fieldRg: string;
  fieldMaritalStatus: string;
  fieldValidity: string;
  maritalStatus: (status: MemberMaritalStatus) => string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string | null): string {
  if (!value) {
    return '';
  }
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) {
    return value;
  }
  return `${d}/${m}/${y}`;
}

function filiationLines(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(/\n+|\/+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fieldHtml(modifier: string, label: string, valueHtml: string): string {
  return `<div class="field field--${modifier}">
    <span class="label">${escapeHtml(label)}</span>
    <span class="value">${valueHtml}</span>
  </div>`;
}

function buildFrontFace(
  card: IMembershipCard,
  labels: IMembershipCardPrintLabels,
  origin: string,
  logoSrc: string | null,
): string {
  const lines = filiationLines(card.front.filiation)
    .map((line) => `<span class="filiation-line">${escapeHtml(line)}</span>`)
    .join('');
  const photo = card.front.photoDataUrl
    ? `<img src="${card.front.photoDataUrl}" alt="" />`
    : '';
  const logo = logoSrc
    ? `<div class="logo logo--front"><img src="${logoSrc}" alt="" /></div>`
    : '';
  const header2 = card.institution.headerLine2
    ? `<p class="header2">${escapeHtml(card.institution.headerLine2)}</p>`
    : '';
  const ministry = card.institution.ministryLabel
    ? `<p class="ministry">${escapeHtml(card.institution.ministryLabel)}</p>`
    : '';

  return `<article class="card">
    <div class="face">
      <img class="template" src="${origin}/membership-cards/front-template.png" alt="" />
      ${logo}
      <div class="titles titles--front">
        <p class="header1">${escapeHtml(card.institution.headerLine1)}</p>
        ${header2}
        ${ministry}
      </div>
      <p class="vertical vertical--front">${escapeHtml(labels.cardLabel)}</p>
      <div class="photo">${photo}</div>
      ${fieldHtml('registration', labels.fieldRegistration, escapeHtml(card.front.registrationNumber ?? ''))}
      ${fieldHtml('name', labels.fieldName, escapeHtml(card.front.fullName))}
      ${fieldHtml('filiation', labels.fieldFiliation, `<span class="multiline">${lines}</span>`)}
      ${fieldHtml('birth', labels.fieldBirthDate, escapeHtml(formatDate(card.front.birthDate)))}
      ${fieldHtml('birthplace', labels.fieldPlaceOfBirth, escapeHtml(card.front.placeOfBirth ?? ''))}
      ${fieldHtml('position', labels.fieldPosition, escapeHtml(card.front.positionTitle ?? ''))}
      ${fieldHtml('blood', labels.fieldBloodType, escapeHtml(card.front.bloodType ?? ''))}
    </div>
  </article>`;
}

function buildBackFace(
  card: IMembershipCard,
  labels: IMembershipCardPrintLabels,
  origin: string,
  logoSrc: string | null,
  signatureSrc: string | null,
): string {
  const logo = logoSrc
    ? `<div class="logo logo--back"><img src="${logoSrc}" alt="" /></div>`
    : '';
  const header2 = card.institution.headerLine2
    ? `<p class="header2">${escapeHtml(card.institution.headerLine2)}</p>`
    : '';
  const ministry = card.institution.ministryLabel
    ? `<p class="ministry">${escapeHtml(card.institution.ministryLabel)}</p>`
    : '';
  const qr = card.back.qrCodeDataUrl
    ? `<div class="qr"><img src="${card.back.qrCodeDataUrl}" alt="" /></div>`
    : '';
  const signature = signatureSrc
    ? `<img class="sig" src="${signatureSrc}" alt="" />`
    : '';
  const presidentClass = signatureSrc
    ? 'president president--with-signature'
    : 'president';

  return `<article class="card">
    <div class="face">
      <img class="template" src="${origin}/membership-cards/back-template.png" alt="" />
      ${logo}
      <div class="titles titles--back">
        <p class="header1">${escapeHtml(card.institution.headerLine1)}</p>
        ${header2}
        ${ministry}
      </div>
      <p class="vertical vertical--back">${escapeHtml(labels.cardLabel)}</p>
      ${fieldHtml('cpf', labels.fieldCpf, escapeHtml(card.back.cpf ?? ''))}
      ${fieldHtml('rg', labels.fieldRg, escapeHtml(card.back.rg ?? ''))}
      ${fieldHtml('marital', labels.fieldMaritalStatus, escapeHtml(labels.maritalStatus(card.back.maritalStatus)))}
      ${fieldHtml('validity', labels.fieldValidity, escapeHtml(formatDate(card.back.validUntil)))}
      ${qr}
      <div class="${presidentClass}">
        ${signature}
        <p class="president-name">${escapeHtml(card.institution.presidentName ?? '')}</p>
        <p class="president-title">${escapeHtml(card.institution.presidentTitle)}</p>
      </div>
      <p class="footer">${escapeHtml(card.institution.footerNotice)}</p>
    </div>
  </article>`;
}

/** Dimensões físicas da unidade frente|verso (ID-1 × 2). */
const UNIT_W_MM = 171.2;
const UNIT_H_MM = 53.98;
const UNIT_ASPECT = UNIT_W_MM / UNIT_H_MM;

interface IPrintPackLayout {
  pageW: number;
  pageH: number;
  marginMm: number;
  gapMm: number;
  cols: number;
  rows: number;
  unitW: number;
  unitH: number;
  scale: number;
  perPage: number;
}

/**
 * Empilha carteirinhas em 1 por linha (frente|verso lado a lado),
 * maximizando quantas cabem na vertical em A4 retrato.
 */
export function computeMembershipCardPrintLayout(): IPrintPackLayout {
  const marginMm = 5;
  const gapMm = 3;
  const pageW = 210;
  const pageH = 297;
  const usableW = pageW - 2 * marginMm;
  const usableH = pageH - 2 * marginMm;

  // Sempre 1 coluna: cada linha = uma carteirinha (frente | verso).
  const unitW = Math.min(UNIT_W_MM, usableW);
  const unitH = unitW / UNIT_ASPECT;
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (unitH + gapMm)));
  const scale = unitW / UNIT_W_MM;

  return {
    pageW,
    pageH,
    marginMm,
    gapMm,
    cols: 1,
    rows,
    unitW,
    unitH,
    scale,
    perPage: rows,
  };
}

function buildPrintCss(layout: IPrintPackLayout): string {
  return `
@page {
  size: A4 portrait;
  margin: ${layout.marginMm}mm;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${layout.gapMm}mm;
}
.sheet-slot {
  width: ${layout.unitW.toFixed(3)}mm;
  height: ${layout.unitH.toFixed(3)}mm;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.sheet {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: ${UNIT_W_MM}mm;
  height: ${UNIT_H_MM}mm;
  transform: scale(${layout.scale.toFixed(5)});
  transform-origin: top left;
  overflow: hidden;
}
.fold-guide {
  flex: 0 0 0;
  width: 0;
  border-left: 0.2mm dashed #9aa3af;
  align-self: stretch;
}
.card {
  --red: #d32f2f;
  --green: #2e7d32;
  --blue: #1565c0;
  position: relative;
  flex: 0 0 85.6mm;
  width: 85.6mm;
  height: 53.98mm;
  overflow: hidden;
  background: #e6e6e6;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}
.face { position: relative; width: 100%; height: 100%; }
.template {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill; display: block; z-index: 0;
}
.logo {
  position: absolute; z-index: 3; width: 14%; aspect-ratio: 1; overflow: hidden;
}
.logo--front { left: 3%; top: 3%; }
.logo--back { right: 3%; top: 3%; }
.logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.titles {
  position: absolute; z-index: 2; text-align: center; top: 4.5%; width: 58%;
}
.titles--front { left: 19%; }
.titles--back { left: 18%; width: 60%; }
.header1, .header2 {
  margin: 0; color: var(--red); font-weight: 800; font-size: 2.4mm; line-height: 1.12;
}
.ministry {
  margin: 0.8mm 0 0; color: var(--green); font-weight: 800; font-size: 1.9mm; line-height: 1.15;
}
.vertical {
  position: absolute; z-index: 2; margin: 0; font-size: 1.8mm; font-weight: 800;
  letter-spacing: 0.12em; color: var(--blue); text-transform: uppercase; white-space: nowrap;
}
.vertical--front { left: 0.2%; top: 38%; writing-mode: vertical-rl; transform: rotate(180deg); }
.vertical--back { right: 0.2%; top: 38%; writing-mode: vertical-rl; }
.photo {
  position: absolute; z-index: 2; left: 3%; top: 28%; width: 29.5%; height: 55%;
  overflow: hidden; border-radius: 1.2mm;
}
.photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.field {
  position: absolute; z-index: 2; display: flex; flex-direction: column; gap: 0.3mm;
  padding: 0.5mm 1mm; min-width: 0; overflow: hidden;
}
.label {
  color: var(--blue); font-size: 1.35mm; font-weight: 800; letter-spacing: 0.04em;
  line-height: 1.1; text-transform: uppercase;
}
.value {
  font-size: 1.9mm; font-weight: 600; line-height: 1.15; color: #111;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.multiline {
  white-space: normal; display: flex; flex-direction: column; gap: 0.4mm; line-height: 1.25;
}
.filiation-line {
  display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.field--registration {
  left: 3%; top: 82%; width: 29.5%; height: 12%; align-items: center; text-align: center;
}
.field--registration .label { font-size: 1.2mm; }
.field--registration .value {
  font-size: 2.6mm; font-weight: 700; letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums; text-align: center;
}
.field--name { left: 36.2%; top: 27.2%; width: 61%; height: 11%; }
.field--filiation { left: 36.2%; top: 41.5%; width: 61%; height: 22.5%; }
.field--birth { left: 36.2%; top: 67.2%; width: 30%; height: 11%; }
.field--birthplace { left: 67.5%; top: 67.2%; width: 30%; height: 11%; }
.field--position { left: 36.2%; top: 81.2%; width: 30%; height: 8%; }
.field--blood { left: 67.5%; top: 81.2%; width: 30%; height: 8%; }
.field--cpf { left: 4.5%; top: 29.5%; width: 30%; height: 11%; }
.field--rg { left: 37.5%; top: 29.5%; width: 30%; height: 11%; }
.field--marital { left: 4.5%; top: 43.6%; width: 30%; height: 11%; }
.field--validity { left: 37.5%; top: 43.6%; width: 30%; height: 11%; }
.qr {
  position: absolute; z-index: 2; left: 71%; top: 29.5%; width: 22%; aspect-ratio: 1;
  padding: 0.5mm; background: #fff; border-radius: 0.6mm; overflow: hidden;
}
.qr img { width: 100%; height: 100%; object-fit: contain; display: block; }
.president {
  position: absolute; z-index: 2; left: 10%; top: 80%; width: 52%;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.president--with-signature { top: 70%; }
.sig { max-width: 70%; max-height: 5mm; object-fit: contain; margin-bottom: 0.2mm; }
.president-name, .president-title {
  margin: 0; color: var(--blue); font-weight: 800; text-transform: uppercase;
  line-height: 1.15; font-size: 1.7mm;
}
.president-name { margin-top: 3.5mm; }
.president-title { margin-top: 0.3mm; font-size: 1.4mm; }
.footer {
  position: absolute; z-index: 2; left: 6%; right: 10%; bottom: 2.8%; margin: 0;
  text-align: center; color: var(--blue); font-weight: 800; text-transform: uppercase;
  font-size: 1.2mm; line-height: 1.2;
}
`;
}

export function buildMembershipCardsPrintHtml(
  cards: IMembershipCard[],
  labels: IMembershipCardPrintLabels,
  assets: { logoSrc: string | null; signatureSrc: string | null },
): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const layout = computeMembershipCardPrintLayout();
  // Frente | Verso na mesma linha — ao dobrar ao meio, o verso fica atrás da frente.
  const sheets = cards
    .map((card) => {
      const front = buildFrontFace(card, labels, origin, assets.logoSrc);
      const back = buildBackFace(
        card,
        labels,
        origin,
        assets.logoSrc,
        assets.signatureSrc,
      );
      return `<div class="sheet-slot"><div class="sheet">${front}<div class="fold-guide" aria-hidden="true"></div>${back}</div></div>`;
    })
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Carteirinhas</title>
  <style>${buildPrintCss(layout)}</style>
</head>
<body>${sheets}</body>
</html>`;
}

export function printMembershipCardsHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return;
  }
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => iframe.remove();
  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(cleanup, 2500);
  };

  frameWindow.addEventListener('afterprint', cleanup, { once: true });
  // Aguarda imagens (template/foto/QR) carregarem antes de imprimir.
  const images = Array.from(frameDocument.images);
  if (images.length === 0) {
    triggerPrint();
    return;
  }
  let pending = images.length;
  const onDone = () => {
    pending -= 1;
    if (pending <= 0) {
      triggerPrint();
    }
  };
  for (const image of images) {
    if (image.complete) {
      onDone();
    } else {
      image.addEventListener('load', onDone, { once: true });
      image.addEventListener('error', onDone, { once: true });
    }
  }
  window.setTimeout(triggerPrint, 4000);
}
