// Utilidades de interfaz, conexión con el servidor y tema

const APP = document.getElementById('app');
const CAPA = document.getElementById('capa');
const ACC = {};

function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
function guardar(clave, valor) {
  try { if (valor === null) localStorage.removeItem(clave); else localStorage.setItem(clave, valor); } catch (e) {}
}
function leerJSON(clave) { try { return JSON.parse(leer(clave) || 'null'); } catch (e) { return null; } }

const estado = {
  codigo: new URLSearchParams(location.search).get('c') || '',
  token: leer('cyr_token'),
  usuario: leerJSON('cyr_usuario'),
  ficha: null, historial: null, filtro: 'todo', pendiente: null, timer: null
};

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}
function fFecha(d) { return d ? new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : ''; }
function fHora(d) { return d ? new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''; }
function signo(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
function vibrar() { if (navigator.vibrate) navigator.vibrate(60); }

const ICONOS = {
  mas: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  regalo: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
  herramienta: '<path d="M14.5 6.5a4 4 0 0 0 5 5l-8 8a2.1 2.1 0 0 1-3-3l8-8a4 4 0 0 0-2-2z"/>',
  devolver: '<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  derecha: '<path d="M9 6l6 6-6 6"/>',
  atras: '<path d="M15 6l-6 6 6 6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  nfc: '<path d="M6 8a6 6 0 0 1 0 8M10 5a10 10 0 0 1 0 14M14 2.5a14 14 0 0 1 0 19"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
  salir: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  anulado: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  tema: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'
};
function ico(nombre, t = 22) {
  return `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre]}</svg>`;
}
function logo() {
  const c = '#22B7C0';
  return `<svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true"><path d="M58 22A34 34 0 1 0 60 86" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M44 54L40 16M44 54L66 32M44 54L84 58" stroke="${c}" stroke-width="4"/><circle cx="44" cy="54" r="14" fill="${c}"/><circle cx="40" cy="14" r="7" fill="${c}"/><circle cx="67" cy="31" r="6" fill="${c}"/><circle cx="85" cy="58" r="7" fill="${c}"/></svg>`;
}

function pantalla(html) {
  if (estado.timer) { clearInterval(estado.timer); estado.timer = null; }
  cerrarCapa();
  APP.innerHTML = html;
  window.scrollTo(0, 0);
}
function abrirCapa(html) {
  CAPA.innerHTML = '<div class="velo" data-accion="cerrarCapa"></div>' + html;
  CAPA.classList.add('abierta');
  const campo = CAPA.querySelector('input');
  if (campo) campo.focus();
}
function cerrarCapa() { CAPA.classList.remove('abierta'); CAPA.innerHTML = ''; }
ACC.cerrarCapa = cerrarCapa;

function ocupado(el, si) {
  if (!el) return;
  if (si) { el.dataset.texto = el.textContent; el.textContent = 'Procesando…'; el.disabled = true; }
  else { if (el.dataset.texto) el.textContent = el.dataset.texto; el.disabled = false; }
}
function mostrarError(mensaje, id = 'error') {
  const el = document.getElementById(id);
  if (el) { el.textContent = mensaje; el.hidden = false; }
}

async function api(accion, datos = {}) {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PEGA_AQUI') === 0) {
    throw { codigo: 'CONFIG', mensaje: 'Falta configurar la URL del servidor en config.js' };
  }
  const cuerpo = Object.assign({ accion: accion }, datos);
  if (estado.token) cuerpo.token = estado.token;
  let r;
  try {
    const resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo)
    });
    r = await resp.json();
  } catch (e) {
    throw { codigo: 'RED', mensaje: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.' };
  }
  if (!r.ok) {
    if (r.codigo === 'SESION') cerrarSesionLocal();
    throw { codigo: r.codigo, mensaje: r.mensaje };
  }
  return r.data;
}

function cerrarSesionLocal() {
  estado.token = null; estado.usuario = null;
  guardar('cyr_token', null); guardar('cyr_usuario', null);
}

function aplicarTema() {
  const t = leer('cyr_tema');
  if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function cuentaRegresiva(el, segundos) {
  let s = segundos;
  const tick = () => {
    if (s <= 0) { el.remove(); clearInterval(estado.timer); estado.timer = null; return; }
    el.textContent = `Anular · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    s--;
  };
  tick();
  estado.timer = setInterval(tick, 1000);
}

// Confirmación antes de guardar. El identificador de operación se crea una sola vez,
// así un reintento no duplica el registro.
function confirmar(opc) {
  estado.pendiente = Object.assign({}, opc, { operacion: uuid() });
  const filas = opc.lineas.map(([k, v]) =>
    `<div class="fila-resumen"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  abrirCapa(`<div class="hoja"><h2>${esc(opc.titulo)}</h2><div class="resumen">${filas}</div>
    <p id="errorCapa" class="mensaje-error" hidden></p>
    <button class="boton primario" data-accion="confirmarSi">${esc(opc.boton || 'Confirmar')}</button>
    <button class="boton texto" data-accion="cerrarCapa">Cancelar</button></div>`);
}
ACC.confirmarSi = async (v, el) => {
  const p = estado.pendiente;
  if (!p) return;
  ocupado(el, true);
  try {
    const r = await p.ejecutar(p.operacion);
    estado.pendiente = null;
    p.exito(r);
  } catch (e) {
    if (e.codigo === 'SESION') return pantallaLogin();
    mostrarError(e.mensaje, 'errorCapa');
    ocupado(el, false);
  }
};

ACC.menu = () => {
  const t = leer('cyr_tema') || 'auto';
  const ayuda = { auto: 'Sigue la configuración de tu teléfono.', claro: 'Siempre en modo claro.', oscuro: 'Siempre en modo oscuro.' }[t];
  const opciones = [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']]
    .map(([id, l]) => `<button class="${t === id ? 'activo' : ''}" data-accion="tema" data-valor="${id}">${l}</button>`).join('');
  const u = estado.token && estado.usuario;
  abrirCapa(`<div class="hoja">
    ${u ? `<div class="estudiante"><div class="avatar">${ico('usuario')}</div><div class="flex"><div class="nombre">${esc(u.nombre)}</div><div class="suave">${esc(u.rol)}</div></div></div>` : ''}
    <p class="etiqueta">Apariencia</p><div class="segmentado">${opciones}</div><p class="suave pequeno">${ayuda}</p>
    ${u ? `<button class="boton peligro" data-accion="salir">${ico('salir')}<span>Cerrar sesión</span></button>` : ''}
    <button class="boton texto" data-accion="cerrarCapa">Cerrar</button></div>`);
};
ACC.tema = v => { guardar('cyr_tema', v === 'auto' ? null : v); aplicarTema(); ACC.menu(); };
ACC.salir = async () => {
  try { await api('logout'); } catch (e) {}
  cerrarSesionLocal();
  iniciar();
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-accion]');
  if (!el || el.disabled) return;
  const fn = ACC[el.dataset.accion];
  if (fn) { ev.preventDefault(); fn(el.dataset.valor, el); }
});
document.addEventListener('change', ev => {
  const input = ev.target;
  if (input.type === 'radio') {
    document.querySelectorAll(`input[name="${input.name}"]`).forEach(i => {
      const op = i.closest('.opcion');
      if (op) op.classList.toggle('elegida', i.checked);
    });
    if (input.name === 'actividad') {
      const campos = document.getElementById('camposOtro');
      if (campos) campos.hidden = input.value !== 'otro';
    }
  }
  if (input.type === 'checkbox') {
    const op = input.closest('.opcion');
    if (op) op.classList.toggle('elegida', input.checked);
  }
  const err = document.getElementById('error');
  if (err) err.hidden = true;
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'clave') {
    ACC.entrar(null, document.querySelector('[data-accion="entrar"]'));
  }
});
