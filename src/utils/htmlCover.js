const MONTHS = Object.freeze(['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']);

export const COVER_STYLE_OPTIONS = Object.freeze([
  { value: 'editorial', label: 'Editorial', hint: 'Bloque tipografico fuerte con foto lateral contenida.' },
  { value: 'architect', label: 'Arquitectonica', hint: 'Sensacion tecnica con reticula, ficha lateral y foto protagonista.' },
  { value: 'minimal', label: 'Minimal', hint: 'Sobria, con aire editorial y sin depender de imagen.' },
  { value: 'institutional', label: 'Institucional', hint: 'Cabecera formal, masa visual limpia y tono corporativo.' },
  { value: 'blueprint', label: 'Blueprint', hint: 'Mas expresiva, con franjas y composicion de laminas.' },
  { value: 'folio', label: 'Folio', hint: 'Estilo dossier, con ficha vertical y geometria sobria.' }
]);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeCoverColor(value) {
  const color = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#006399';
}

export function formatCoverDate(coverData) {
  if (coverData?.month || coverData?.year) return [coverData.month, coverData.year].filter(Boolean).join(' ');
  const raw = String(coverData?.date || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw || 'Fecha por definir';
  const [, year, month] = match;
  return `${MONTHS[Number(month) - 1] || month} ${year}`;
}

export function buildHtmlCoverModel(payload, resolveAsset = (value) => String(value || '').trim()) {
  const coverData = payload?.coverData || {};
  const projectData = coverData.projectData || {};
  return {
    style: coverData.coverStyle || 'editorial',
    primaryColor: normalizeCoverColor(coverData.primaryColor),
    entity: coverData.companyName || projectData.var_entidad || 'Entidad responsable',
    title: payload?.documentName || coverData.title || 'Documento tecnico',
    projectName: projectData.var_nombre_proyecto || coverData.subtitle || payload?.documentName || 'Proyecto',
    cui: projectData.var_cui || coverData.docCode || 'CUI pendiente',
    location: coverData.locationLabel || [projectData.var_provincia, projectData.var_departamento].filter(Boolean).join(' -- ') || 'Ubicacion por definir',
    dateLabel: formatCoverDate(coverData),
    logoSrc: resolveAsset(coverData.logo),
    photoSrc: resolveAsset(coverData.coverPhoto)
  };
}

function buildVisualBlock(model, kind) {
  if ((kind === 'photo' || kind === 'photo-soft') && model.photoSrc) {
    return `<img src="${escapeHtml(model.photoSrc)}" alt="Portada" class="${kind === 'photo-soft' ? 'photo photo-soft' : 'photo'}" />`;
  }
  if (kind === 'photo-soft') return '<div class="photo-fallback soft"></div>';
  if (kind === 'photo') return '<div class="photo-fallback"></div>';
  return '';
}

function buildCoverBody(model) {
  const logo = model.logoSrc
    ? `<img src="${escapeHtml(model.logoSrc)}" alt="Logo" class="logo-image" />`
    : '<div class="logo-fallback">LOGO</div>';

  switch (model.style) {
    case 'architect':
      return `
        <main class="cover architect">
          <section class="architect-media">
            ${buildVisualBlock(model, 'photo')}
            <div class="architect-media-overlay"></div>
          </section>
          <section class="architect-sheet">
            <div class="header compact">
              <div>
                <p class="eyebrow">Expediente tecnico</p>
                <p class="entity">${escapeHtml(model.entity)}</p>
              </div>
              <div class="logo-box">${logo}</div>
            </div>
            <div class="architect-copy">
              <h1 class="title dark">${escapeHtml(model.title)}</h1>
              <p class="project dark">${escapeHtml(model.projectName)}</p>
            </div>
            <div class="architect-meta">
              <div class="meta-card">
                <span class="meta-label">CUI</span>
                <strong>${escapeHtml(model.cui)}</strong>
              </div>
              <div class="architect-meta-grid">
                <div class="meta-card">
                  <span class="meta-label">Ubicacion</span>
                  <strong>${escapeHtml(model.location)}</strong>
                </div>
                <div class="meta-card">
                  <span class="meta-label">Fecha</span>
                  <strong>${escapeHtml(model.dateLabel)}</strong>
                </div>
              </div>
            </div>
          </section>
        </main>`;
    case 'minimal':
      return `
        <main class="cover minimal">
          <div class="minimal-bar"></div>
          <div class="minimal-header">
            <div>
              <p class="eyebrow">Memoria tecnica</p>
              <p class="entity">${escapeHtml(model.entity)}</p>
            </div>
            <div class="logo-box muted">${logo}</div>
          </div>
          <div class="minimal-body">
            <h1 class="title">${escapeHtml(model.title)}</h1>
            <div class="rule"></div>
            <p class="project">${escapeHtml(model.projectName)}</p>
          </div>
          <div class="minimal-meta">
            <div class="meta-card">
              <span class="meta-label">CUI</span>
              <strong>${escapeHtml(model.cui)}</strong>
            </div>
            <div class="meta-card">
              <span class="meta-label">Fecha</span>
              <strong>${escapeHtml(model.dateLabel)}</strong>
            </div>
            <p class="meta-foot">${escapeHtml(model.location)}</p>
          </div>
        </main>`;
    case 'institutional':
      return `
        <main class="cover institutional">
          <div class="institutional-top"></div>
          <div class="institutional-header">
            <div>
              <p class="eyebrow light">Documento tecnico</p>
              <p class="entity inverse">${escapeHtml(model.entity)}</p>
            </div>
            <div class="logo-box inverse">${logo}</div>
          </div>
          <section class="institutional-main">
            <div class="institutional-copy">
              <div class="institutional-intro">
                <p class="section-label" style="color:${escapeHtml(model.primaryColor)}">Memoria descriptiva</p>
                <h1 class="title dark">${escapeHtml(model.title)}</h1>
              </div>
              <div class="institutional-project-block">
                <p class="project dark">${escapeHtml(model.projectName)}</p>
              </div>
            </div>
            <div class="institutional-side">
              <div class="meta-card">
                <span class="meta-label">Codigo unico</span>
                <strong>${escapeHtml(model.cui)}</strong>
              </div>
              <div class="meta-card">
                <span class="meta-label">Ubicacion</span>
                <strong>${escapeHtml(model.location)}</strong>
              </div>
              <div class="meta-card">
                <span class="meta-label">Fecha</span>
                <strong>${escapeHtml(model.dateLabel)}</strong>
              </div>
            </div>
          </section>
          <div class="institutional-footer-band">
            <span>${escapeHtml(model.entity)}</span>
            <span>${escapeHtml(model.dateLabel)}</span>
          </div>
        </main>`;
    case 'blueprint':
      return `
        <main class="cover blueprint">
          <div class="blueprint-band" style="background:${escapeHtml(model.primaryColor)}"></div>
          <div class="blueprint-header">
            <div>
              <p class="eyebrow dim">Plano editorial</p>
              <p class="entity inverse">${escapeHtml(model.entity)}</p>
            </div>
            <div class="logo-box glass">${logo}</div>
          </div>
          <div class="blueprint-core">
            <h1 class="title inverse">${escapeHtml(model.title)}</h1>
            <p class="project inverse muted">${escapeHtml(model.projectName)}</p>
            <div class="blueprint-draft"></div>
          </div>
          <div class="blueprint-meta">
            <div class="meta-card bright">
              <span class="meta-label">CUI</span>
              <strong>${escapeHtml(model.cui)}</strong>
            </div>
            <div class="meta-card bright">
              <span class="meta-label">Fecha</span>
              <strong>${escapeHtml(model.dateLabel)}</strong>
            </div>
          </div>
          <p class="blueprint-foot">${escapeHtml(model.location)}</p>
        </main>`;
    case 'folio':
      return `
        <main class="cover folio">
          <aside class="folio-rail" style="background:${escapeHtml(model.primaryColor)}">
            <div class="logo-box inverse">${logo}</div>
            <div class="folio-rail-copy">
              <p class="eyebrow dim">Dossier</p>
              <p class="entity inverse">${escapeHtml(model.entity)}</p>
            </div>
          </aside>
          <section class="folio-main">
            <div class="folio-title">
              <p class="eyebrow">Documento</p>
              <h1 class="title dark">${escapeHtml(model.title)}</h1>
            </div>
            <div class="folio-project">
              <p class="project dark">${escapeHtml(model.projectName)}</p>
            </div>
            <div class="folio-meta">
              <div class="meta-card">
                <span class="meta-label">CUI</span>
                <strong>${escapeHtml(model.cui)}</strong>
              </div>
              <div class="meta-card">
                <span class="meta-label">Fecha</span>
                <strong>${escapeHtml(model.dateLabel)}</strong>
              </div>
            </div>
            <p class="meta-foot">${escapeHtml(model.location)}</p>
          </section>
        </main>`;
    default:
      return `
        <main class="cover editorial">
          <div class="editorial-top"></div>
          <div class="editorial-header">
            <div>
              <p class="eyebrow">Expediente digital</p>
              <p class="entity">${escapeHtml(model.entity)}</p>
            </div>
            <div class="logo-box">${logo}</div>
          </div>
          <div class="editorial-grid">
            <section class="editorial-copy">
              <div class="pill" style="background:${escapeHtml(model.primaryColor)}">Documento</div>
              <h1 class="title dark">${escapeHtml(model.title)}</h1>
              <div class="project-box">
                <p class="project dark">${escapeHtml(model.projectName)}</p>
              </div>
            </section>
            <section class="editorial-media">${buildVisualBlock(model, 'photo')}</section>
          </div>
          <div class="editorial-meta">
            <div class="meta-card"><span class="meta-label">CUI</span><strong>${escapeHtml(model.cui)}</strong></div>
            <div class="meta-card"><span class="meta-label">Lugar</span><strong>${escapeHtml(model.location)}</strong></div>
            <div class="meta-card"><span class="meta-label">Fecha</span><strong>${escapeHtml(model.dateLabel)}</strong></div>
          </div>
        </main>`;
  }
}

function buildCoverStyles(primaryColor) {
  return `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 210mm; height: 297mm; }
    body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; background: #eef2f6; color: #0f172a; }
    .cover { position: relative; width: 210mm; height: 297mm; margin: 0 auto; background: white; overflow: hidden; }
    .eyebrow { margin: 0; font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #94a3b8; }
    .eyebrow.light, .eyebrow.dim { color: rgba(255,255,255,0.72); }
    .entity { margin: 14px 0 0; font-size: 14px; font-weight: 700; line-height: 1.3; text-transform: uppercase; }
    .entity.inverse { color: white; }
    .title { margin: 0; text-transform: uppercase; font-weight: 900; line-height: 0.98; }
    .title.dark { color: #020617; }
    .title.inverse { color: white; }
    .project { margin: 0; font-size: 14px; font-weight: 700; line-height: 1.45; text-transform: uppercase; }
    .project.dark { color: #334155; }
    .project.inverse { color: white; }
    .project.inverse.muted { color: rgba(255,255,255,0.78); }
    .logo-box { width: 60px; height: 60px; border-radius: 18px; border: 1px solid #e2e8f0; background: white; display:flex; align-items:center; justify-content:center; padding:10px; box-shadow:0 8px 20px rgba(15,23,42,0.06); overflow:hidden; }
    .logo-box.inverse { background: rgba(255,255,255,0.96); border: none; }
    .logo-box.glass { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.16); backdrop-filter: blur(10px); }
    .logo-box.muted { background: #f8fafc; }
    .logo-image { width:100%; height:100%; object-fit:contain; }
    .logo-fallback { font-size:10px; color:#94a3b8; }
    .meta-card { border-radius:18px; border:1px solid #e2e8f0; background:white; padding:14px 16px; }
    .meta-card.bright { background: rgba(255,255,255,0.96); border:none; }
    .meta-label { display:block; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:#94a3b8; margin-bottom:8px; }
    .meta-card strong, .card-footer strong, .meta-foot { font-size:14px; color:#0f172a; }
    .photo, .photo-soft, .photo-fallback { width:100%; height:100%; object-fit:cover; display:block; }
    .photo-soft { opacity:0.35; mix-blend-mode:screen; }
    .photo-fallback { background: linear-gradient(135deg, #dbe7ee 0%, #f8fbfd 56%, #c8d6e0 100%); }
    .photo-fallback.soft { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); opacity:0.35; }
    .editorial { padding:22mm 18mm 18mm; background: linear-gradient(180deg,#f7fafc 0%,#ffffff 36%,#edf3f7 100%); }
    .editorial-top { position:absolute; inset:0 0 auto 0; height:8px; background:${primaryColor}; }
    .editorial-header, .institutional-header, .blueprint-header { display:flex; justify-content:space-between; gap:16px; position:relative; }
    .editorial-grid { display:grid; grid-template-columns:1.04fr 0.96fr; gap:18px; margin-top:18mm; align-items:center; }
    .pill { display:inline-flex; padding:9px 18px; color:white; border-radius:999px; font-size:10px; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; }
    .editorial-copy .title { margin-top:16px; font-size:34px; max-width:10ch; }
    .project-box { margin-top:18px; padding:20px 22px; border-radius:22px; border:1px solid #e2e8f0; background:rgba(255,255,255,0.96); box-shadow:0 12px 30px rgba(15,23,42,0.05); }
    .editorial-media { height:255px; border-radius:24px; border:1px solid #e2e8f0; overflow:hidden; background:#f1f5f9; box-shadow:0 16px 28px rgba(15,23,42,0.08); }
    .editorial-meta { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-top:20px; }
    .architect { background:#f8fafc; }
    .architect-media { position:absolute; inset:0 0 40% 0; background:#e2e8f0; }
    .architect-media-overlay { position:absolute; inset:0; background:linear-gradient(180deg, rgba(15,23,42,0.06) 0%, rgba(15,23,42,0.28) 100%); }
    .architect-sheet { position:absolute; left:14mm; right:14mm; bottom:14mm; background:white; border-radius:26px; padding:16px 18px 18px; box-shadow:0 24px 44px rgba(15,23,42,0.14); }
    .header.compact { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .architect-copy { margin-top:16px; }
    .architect-copy .title { font-size:30px; color:#020617; max-width:12ch; }
    .architect-copy .project { margin-top:14px; }
    .architect-meta { margin-top:18px; display:grid; gap:12px; }
    .architect-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .minimal { padding:24mm 18mm 16mm 22mm; }
    .minimal-bar { position:absolute; inset:0 auto 0 0; width:10px; background:${primaryColor}; }
    .minimal-header { display:flex; justify-content:space-between; gap:16px; margin-left:8px; }
    .minimal-body { margin:38mm 0 0 8px; }
    .minimal-body .title { font-size:40px; max-width:9ch; color:#020617; }
    .minimal .rule { width:64px; height:1px; background:${primaryColor}; margin:28px 0; }
    .minimal-body .project { max-width:24ch; }
    .minimal-meta { margin:auto 0 0 8px; }
    .minimal-meta .meta-card + .meta-card { margin-top:12px; }
    .meta-foot { margin:16px 0 0; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#64748b; }
    .institutional { display:flex; flex-direction:column; padding:18mm 18mm 16mm; background:linear-gradient(180deg, #f8fbfd 0%, #ffffff 100%); }
    .institutional-top { position:absolute; inset:0 0 auto 0; height:68px; background:linear-gradient(90deg, ${primaryColor}, ${primaryColor}CC); }
    .institutional-header { position:relative; align-items:flex-start; padding-top:6mm; }
    .institutional-main { position:relative; display:grid; grid-template-columns:minmax(0, 1.45fr) minmax(64mm, 0.55fr); gap:14px; margin-top:18mm; flex:1; min-height:0; align-items:stretch; }
    .institutional-copy { display:flex; flex-direction:column; justify-content:space-between; min-height:100%; padding:24px 26px; border-radius:28px; border:1px solid #e2e8f0; background:white; box-shadow:0 20px 35px rgba(15,23,42,0.07); }
    .institutional-intro { max-width:24ch; }
    .institutional-project-block { margin-top:22px; padding-top:22px; border-top:1px solid #e2e8f0; }
    .institutional-side { display:grid; grid-template-rows:repeat(3, minmax(0, 1fr)); gap:12px; }
    .institutional-side .meta-card { display:flex; flex-direction:column; justify-content:flex-end; min-height:0; }
    .section-label { margin:0; font-size:11px; letter-spacing:0.28em; text-transform:uppercase; font-weight:700; }
    .institutional-copy .title { margin-top:14px; font-size:34px; max-width:11ch; }
    .institutional-copy .project { max-width:34ch; }
    .institutional-footer-band { position:relative; display:flex; justify-content:space-between; gap:16px; margin-top:14px; padding-top:14px; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.24em; border-top:1px solid #e2e8f0; }
    .blueprint { padding:18mm 16mm; background:#020617; color:white; }
    .blueprint-band { position:absolute; inset:0 0 0 auto; width:34%; }
    .blueprint-core { position:relative; margin-top:34mm; max-width:64%; border:1px solid rgba(255,255,255,0.14); padding:18px 18px 22px; border-radius:24px; background:rgba(255,255,255,0.04); }
    .blueprint-core .title { font-size:36px; }
    .blueprint-core .project { margin-top:18px; }
    .blueprint-draft { margin-top:26px; width:72px; height:72px; border:1px solid rgba(255,255,255,0.22); border-radius:999px; box-shadow: inset 0 0 0 14px rgba(255,255,255,0.04); }
    .blueprint-meta { position:relative; display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:auto; }
    .blueprint-foot { position:relative; margin:16px 0 0; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:rgba(255,255,255,0.6); }
    .folio { display:grid; grid-template-columns:0.36fr 0.64fr; }
    .folio-rail { display:flex; flex-direction:column; justify-content:space-between; padding:18mm 14mm; color:white; }
    .folio-rail-copy { margin-top:auto; }
    .folio-main { display:flex; flex-direction:column; padding:20mm 16mm 18mm; }
    .folio-title .title { margin-top:14px; font-size:32px; }
    .folio-project { margin-top:18px; padding:18px; border-radius:22px; border:1px solid #e2e8f0; background:#f8fafc; }
    .folio-meta { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:auto; padding-top:18px; }
  `;
}

export function buildHtmlCoverDocument(model, options = {}) {
  const previewMode = options.preview === true;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>${escapeHtml(model.title)}</title><style>${buildCoverStyles(model.primaryColor)}
  ${previewMode ? `
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { background: white; }
    .cover { width: 100%; height: 100%; }
  ` : ''}
  </style></head><body>${buildCoverBody(model)}</body></html>`;
}
