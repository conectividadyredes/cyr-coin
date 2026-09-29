// Pantallas y flujo de CyR Coin

const CURSOS = { '3M': '3° medio', '4M': '4° medio' };
const puede = permiso => !!(estado.ficha && estado.ficha.permisos.includes(permiso));
const nombreEst = () => estado.ficha.estudiante.nombres + ' ' + estado.ficha.estudiante.apellidos;

function cabecera() {
  const conSesion = estado.token && estado.usuario;
  const derecha = conSesion
    ? `<button class="chip-usuario" data-accion="menu">${ico('usuario', 18)}<span>${esc(estado.usuario.nombre)}</span></button>`
    : `<button class="icono-boton" data-accion="menu" aria-label="Apariencia">${ico('tema', 20)}</button>`;
  return `<header class="cabecera"><div class="marca">${logo()}<span>CyR Coin</span></div>${derecha}</header>`;
}
function titulo(texto) {
  return `<div class="titulo"><button class="volver" data-accion="volverFicha" aria-label="Volver a la ficha">${ico('atras')}</button>
    <div><h1>${esc(texto)}</h1><p class="suave">${esc(nombreEst())}</p></div></div>`;
}
function pista(texto) { return `<p class="pista">${ico('nfc', 20)}<span>${esc(texto)}</span></p>`; }
function cargando(texto) {
  pantalla(`${cabecera()}<div class="centro"><div class="giro"></div><p class="suave">${esc(texto)}</p></div>`);
}
function pantallaError(mensaje, reintentar) {
  estado.reintentar = reintentar;
  pantalla(`${cabecera()}<div class="centro"><div class="grande-icono">${ico('anulado', 44)}</div>
    <h2>Algo no salió bien</h2><p class="suave">${esc(mensaje)}</p></div>
    ${reintentar ? '<button class="boton primario" data-accion="reintentar">Reintentar</button>' : ''}
    <button class="boton texto" data-accion="inicio">Ir al inicio</button>`);
}
function manejarError(e, reintentar) {
  if (e.codigo === 'SESION') return pantallaLogin();
  pantallaError(e.mensaje, reintentar);
}
ACC.reintentar = () => { if (estado.reintentar) estado.reintentar(); };
ACC.inicio = () => iniciar();

// ---------- Inicio ----------
function iniciar() {
  if (estado.codigo && estado.token) return cargarFicha();
  if (estado.codigo) return cargarPublica();
  if (estado.token) return pantallaEspera();
  return pantallaBienvenida();
}
function pantallaBienvenida() {
  pantalla(`${cabecera()}<div class="centro"><div class="grande-icono">${ico('nfc', 48)}</div>
    <h1>Bienvenido a CyR Coin</h1><p class="suave">Acerca tu tarjeta a la parte trasera del teléfono para ver tus coins.</p></div>
    <button class="boton" data-accion="irLogin">Soy profesor · Iniciar sesión</button>`);
}
function pantallaEspera() {
  pantalla(`${cabecera()}<div class="centro"><div class="grande-icono">${ico('nfc', 48)}</div>
    <h1>Listo para escanear</h1><p class="suave">Acerca la tarjeta de un estudiante a la parte trasera del teléfono.</p></div>`);
}

// ---------- Sesión ----------
function pantallaLogin() {
  pantalla(`${cabecera()}<section class="tarjeta formulario"><h1>Iniciar sesión</h1>
    <p class="suave">Solo para profesores y encargados.</p>
    <label class="campo"><span>Usuario</span><input id="usuario" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <label class="campo"><span>Contraseña</span><input id="clave" type="password" autocomplete="current-password"></label>
    <p id="error" class="mensaje-error" hidden></p>
    <button class="boton primario" data-accion="entrar">Entrar</button>
    <button class="boton texto" data-accion="inicio">Volver</button></section>`);
}
ACC.irLogin = () => pantallaLogin();
ACC.entrar = async (v, el) => {
  const usuario = document.getElementById('usuario').value.trim();
  const clave = document.getElementById('clave').value;
  if (!usuario || !clave) return mostrarError('Completa usuario y contraseña');
  ocupado(el, true);
  try {
    const d = await api('login', { usuario: usuario, clave: clave });
    estado.token = d.token; estado.usuario = d.usuario;
    guardar('cyr_token', d.token); guardar('cyr_usuario', JSON.stringify(d.usuario));
    iniciar();
  } catch (e) {
    mostrarError(e.mensaje);
    ocupado(el, false);
  }
};

// ---------- Vista pública ----------
async function cargarPublica() {
  cargando('Buscando tus coins');
  try { pantallaPublica(await api('publica', { codigo: estado.codigo })); }
  catch (e) { pantallaError(e.mensaje, cargarPublica); }
}
function pantallaPublica(d) {
  const prestamos = d.prestamos.map(p =>
    `<div class="aviso">${ico('herramienta', 20)}<span><strong>Tienes prestada:</strong> ${esc(p.herramienta)} · desde ${fFecha(p.desde)}</span></div>`).join('');
  const movs = d.movimientos.map(m =>
    `<div class="item"><div class="flex"><div class="principal">${esc(m.descripcion)}</div><div class="detalle">${fFecha(m.fecha)}</div></div>
     <div class="monto ${m.monto < 0 ? 'neg' : 'pos'}">${signo(m.monto)}</div></div>`).join('');
  pantalla(`${cabecera()}<h1 style="text-align:center">Hola, ${esc(d.nombre)}</h1>
    <section class="saldo centrado"><span class="rotulo">Tus coins del periodo ${esc(d.periodo)}</span><span class="cifra">${d.saldo}</span></section>
    ${prestamos}<p class="etiqueta">Tus movimientos</p>
    <div class="lista">${movs || '<p class="vacio">Aún no tienes movimientos. ¡Participa y gana tus primeros coins!</p>'}</div>
    <div class="empuje"></div><p class="pista">${ico('ojo', 18)}<span>Vista de solo lectura</span></p>
    <button class="boton texto" data-accion="irLogin">Soy profesor · Iniciar sesión</button>`);
}

// ---------- Ficha del estudiante ----------
async function cargarFicha() {
  cargando('Cargando ficha');
  try { estado.ficha = await api('ficha', { codigo: estado.codigo }); pantallaFicha(); }
  catch (e) { manejarError(e, cargarFicha); }
}
ACC.volverFicha = () => cargarFicha();

function pantallaFicha() {
  const f = estado.ficha, e = f.estudiante;
  const iniciales = (String(e.nombres).charAt(0) + String(e.apellidos).charAt(0)).toUpperCase();
  const acciones = [
    puede('DAR_COINS') && `<button class="accion primaria" data-accion="darCoins">${ico('mas', 26)}<span>Dar coins</span></button>`,
    puede('CANJEAR') && `<button class="accion" data-accion="canjear">${ico('regalo', 26)}<span>Canjear</span></button>`,
    puede('PRESTAR') && `<button class="accion" data-accion="prestar">${ico('herramienta', 26)}<span>Prestar</span></button>`,
    puede('DEVOLVER') && f.prestamos.length > 0 && `<button class="accion" data-accion="devolver">${ico('devolver', 26)}<span>Devolver</span></button>`
  ].filter(Boolean).join('');
  const avisos = f.prestamos.map(p =>
    `<div class="aviso">${ico('herramienta', 20)}<span><strong>Tiene prestada:</strong> ${esc(p.herramienta)} · desde ${fFecha(p.desde)}</span></div>`).join('');
  pantalla(`${cabecera()}
    <section class="tarjeta estudiante"><div class="avatar">${esc(iniciales)}</div><div class="flex">
      <div class="nombre">${esc(nombreEst())}</div><div class="suave">${esc(CURSOS[e.curso] || e.curso || 'Sin curso')} · Conectividad y Redes</div></div></section>
    <section class="saldo"><span class="rotulo">Saldo periodo ${esc(f.periodo)}</span><span class="cifra">${f.saldo}<small>coins</small></span></section>
    ${avisos}
    ${acciones ? `<div class="acciones">${acciones}</div>` : ''}
    ${puede('VER_HISTORIAL') ? `<button class="enlace-fila" data-accion="historial">${ico('reloj')}<span class="flex">Ver historial</span>${ico('derecha', 20)}</button>` : ''}
    <div class="empuje"></div>${pista('Acerca otra tarjeta para cambiar de estudiante')}`);
}

// ---------- Dar coins ----------
ACC.darCoins = () => {
  const c = estado.ficha.catalogo;
  const lista = c.actividades.map(a =>
    `<label class="opcion"><input type="radio" name="actividad" value="${esc(a.id_actividad)}"><span class="flex">${esc(a.nombre)}</span><span class="pill">+${a.coins}</span></label>`).join('');
  pantalla(`${titulo('Dar coins')}<p class="etiqueta">Elige la actividad</p>
    <div class="opciones">${lista}
      <label class="opcion"><input type="radio" name="actividad" value="otro"><span class="flex">Otro</span></label>
      <div class="campos" id="camposOtro" hidden>
        <label class="campo"><span>Describe la actividad</span><input id="descripcion" maxlength="200" autocomplete="off"></label>
        <label class="campo"><span>Coins (máximo ${c.tope_otro})</span><input id="monto" type="number" inputmode="numeric" min="1" max="${c.tope_otro}"></label>
      </div></div>
    <p id="error" class="mensaje-error" hidden></p><div class="empuje"></div>
    <button class="boton primario" data-accion="continuarCoins">Continuar</button>`);
};
ACC.continuarCoins = () => {
  const sel = document.querySelector('input[name="actividad"]:checked');
  if (!sel) return mostrarError('Elige una actividad');
  const c = estado.ficha.catalogo;
  let datos, detalle, monto;
  if (sel.value === 'otro') {
    const descripcion = document.getElementById('descripcion').value.trim();
    monto = Number(document.getElementById('monto').value);
    if (descripcion.length < 3) return mostrarError('Describe la actividad (al menos 3 caracteres)');
    if (!Number.isInteger(monto) || monto < 1 || monto > c.tope_otro) {
      return mostrarError(`Los coins deben ser un número entero entre 1 y ${c.tope_otro}`);
    }
    datos = { descripcion: descripcion, monto: monto };
    detalle = 'Otro: ' + descripcion;
  } else {
    const a = c.actividades.find(x => String(x.id_actividad) === sel.value);
    datos = { id_actividad: a.id_actividad };
    detalle = a.nombre; monto = a.coins;
  }
  confirmar({
    titulo: 'Confirmar coins',
    lineas: [['Estudiante', nombreEst()], ['Actividad', detalle], ['Coins', '+' + monto]],
    boton: `Dar ${monto} coins`,
    ejecutar: op => api('darCoins', Object.assign({ codigo: estado.codigo, operacion: op }, datos)),
    exito: r => pantallaResultado(r)
  });
};

// ---------- Canjear ----------
ACC.canjear = () => {
  const f = estado.ficha;
  const lista = f.catalogo.premios.map(p => {
    const agotado = p.stock !== null && p.stock <= 0;
    const falta = p.costo > f.saldo;
    const nota = agotado ? 'Agotado' : falta ? `Faltan ${p.costo - f.saldo} coins` : (p.stock !== null ? `Quedan ${p.stock}` : '');
    const off = agotado || falta;
    return `<label class="opcion${off ? ' deshabilitada' : ''}"><input type="radio" name="premio" value="${esc(p.id_premio)}"${off ? ' disabled' : ''}>
      <span class="flex">${esc(p.nombre)}${nota ? `<br><span class="suave pequeno">${nota}</span>` : ''}</span><span class="pill gasto">−${p.costo}</span></label>`;
  }).join('');
  pantalla(`${titulo('Canjear')}<p class="etiqueta">Saldo disponible: ${f.saldo} coins</p>
    <div class="opciones">${lista || '<p class="vacio">No hay premios en el catálogo.</p>'}</div>
    <p id="error" class="mensaje-error" hidden></p><div class="empuje"></div>
    <button class="boton primario" data-accion="continuarCanje">Continuar</button>`);
};
ACC.continuarCanje = () => {
  const sel = document.querySelector('input[name="premio"]:checked');
  if (!sel) return mostrarError('Elige un premio');
  const f = estado.ficha;
  const p = f.catalogo.premios.find(x => String(x.id_premio) === sel.value);
  confirmar({
    titulo: 'Confirmar canje',
    lineas: [['Estudiante', nombreEst()], ['Premio', p.nombre], ['Costo', '−' + p.costo + ' coins'], ['Saldo después', (f.saldo - p.costo) + ' coins']],
    boton: 'Canjear',
    ejecutar: op => api('canjear', { codigo: estado.codigo, operacion: op, id_premio: p.id_premio }),
    exito: r => pantallaResultado(r)
  });
};

// ---------- Préstamos ----------
ACC.prestar = () => {
  const hs = estado.ficha.catalogo.herramientas;
  const lista = hs.map(h =>
    `<label class="opcion"><input type="checkbox" name="herramienta" value="${esc(h.id_herramienta)}">
     <span class="flex">${esc(h.nombre)}<br><span class="suave pequeno">${esc(h.codigo)}</span></span></label>`).join('');
  pantalla(`${titulo('Prestar')}<p class="etiqueta">Herramientas disponibles</p>
    <div class="opciones">${lista || '<p class="vacio">No hay herramientas disponibles en este momento.</p>'}</div>
    <p id="error" class="mensaje-error" hidden></p><div class="empuje"></div>
    ${hs.length ? '<button class="boton primario" data-accion="continuarPrestamo">Continuar</button>' : ''}`);
};
ACC.continuarPrestamo = () => {
  const ids = [...document.querySelectorAll('input[name="herramienta"]:checked')].map(i => i.value);
  if (!ids.length) return mostrarError('Selecciona al menos una herramienta');
  const nombres = estado.ficha.catalogo.herramientas.filter(h => ids.includes(String(h.id_herramienta))).map(h => h.nombre).join(', ');
  confirmar({
    titulo: 'Confirmar préstamo',
    lineas: [['Estudiante', nombreEst()], ['Herramientas', nombres]],
    boton: 'Prestar',
    ejecutar: op => api('prestar', { codigo: estado.codigo, operacion: op, ids_herramientas: ids }),
    exito: () => pantallaHecho('Préstamo registrado', nombres)
  });
};
ACC.devolver = () => {
  const lista = estado.ficha.prestamos.map(p =>
    `<div class="campos"><label class="opcion sin-borde"><input type="checkbox" name="devolucion" value="${esc(p.id_prestamo)}">
     <span class="flex">${esc(p.herramienta)}<br><span class="suave pequeno">Desde ${fFecha(p.desde)}</span></span></label>
     <label class="campo"><span>Observación (opcional)</span><input data-obs="${esc(p.id_prestamo)}" maxlength="200" placeholder="Ej: volvió sin pilas"></label></div>`).join('');
  pantalla(`${titulo('Devolver')}<p class="etiqueta">Marca lo que está devolviendo</p><div class="opciones">${lista}</div>
    <p id="error" class="mensaje-error" hidden></p><div class="empuje"></div>
    <button class="boton primario" data-accion="continuarDevolucion">Continuar</button>`);
};
ACC.continuarDevolucion = () => {
  const ids = [...document.querySelectorAll('input[name="devolucion"]:checked')].map(i => i.value);
  if (!ids.length) return mostrarError('Marca al menos una herramienta');
  const devoluciones = ids.map(id => ({ id_prestamo: id, observacion: document.querySelector(`[data-obs="${id}"]`).value.trim() }));
  const nombres = estado.ficha.prestamos.filter(p => ids.includes(String(p.id_prestamo))).map(p => p.herramienta).join(', ');
  confirmar({
    titulo: 'Confirmar devolución',
    lineas: [['Estudiante', nombreEst()], ['Devuelve', nombres]],
    boton: 'Registrar devolución',
    ejecutar: () => api('devolver', { codigo: estado.codigo, devoluciones: devoluciones }),
    exito: () => pantallaHecho('Devolución registrada', nombres)
  });
};

// ---------- Resultados ----------
function pantallaResultado(r) {
  vibrar();
  pantalla(`${cabecera()}<div class="exito"><div class="circulo">${ico('check', 42)}</div>
    <div class="grande">${signo(r.monto)} coins</div><p class="suave">${esc(nombreEst())}</p></div>
    <section class="tarjeta resumen">
      <div class="fila-resumen"><span>Nuevo saldo</span><strong>${r.saldo} coins</strong></div>
      <div class="fila-resumen"><span>Detalle</span><strong>${esc(r.descripcion)}</strong></div>
      <div class="fila-resumen"><span>Registrado por</span><strong>${esc(r.registrado_por)}</strong></div></section>
    ${puede('ANULAR') ? `<button class="boton peligro" id="botonAnular" data-accion="pedirAnular" data-valor="${esc(r.id_movimiento)}">Anular</button>` : ''}
    <div class="empuje"></div>${pista('Acerca la siguiente tarjeta')}
    <button class="boton primario" data-accion="volverFicha">Volver a la ficha</button>`);
  const b = document.getElementById('botonAnular');
  if (b) cuentaRegresiva(b, 5 * 60);
}
function pantallaHecho(texto, detalle) {
  vibrar();
  pantalla(`${cabecera()}<div class="exito"><div class="circulo">${ico('check', 42)}</div>
    <h1>${esc(texto)}</h1><p class="suave">${esc(detalle)}</p></div><div class="empuje"></div>
    ${pista('Acerca la siguiente tarjeta')}<button class="boton primario" data-accion="volverFicha">Volver a la ficha</button>`);
}

// ---------- Anular ----------
ACC.pedirAnular = id => {
  estado.operacionAnular = uuid();
  abrirCapa(`<div class="hoja"><h2>Anular movimiento</h2>
    <p class="suave">Quedará tachado en el historial y se revertirá su efecto en el saldo.</p>
    <label class="campo"><span>Motivo</span><input id="motivo" maxlength="200" placeholder="Ej: estudiante equivocado"></label>
    <p id="errorCapa" class="mensaje-error" hidden></p>
    <button class="boton primario" data-accion="confirmarAnular" data-valor="${esc(id)}">Anular</button>
    <button class="boton texto" data-accion="cerrarCapa">Cancelar</button></div>`);
};
ACC.confirmarAnular = async (id, el) => {
  const motivo = document.getElementById('motivo').value.trim();
  if (motivo.length < 3) return mostrarError('Escribe el motivo (al menos 3 caracteres)', 'errorCapa');
  ocupado(el, true);
  try {
    await api('anular', { codigo: estado.codigo, id_movimiento: id, motivo: motivo, operacion: estado.operacionAnular });
    cargarHistorial();
  } catch (e) {
    if (e.codigo === 'SESION') return pantallaLogin();
    mostrarError(e.mensaje, 'errorCapa');
    ocupado(el, false);
  }
};

// ---------- Historial ----------
ACC.historial = () => { estado.filtro = 'todo'; cargarHistorial(); };
async function cargarHistorial() {
  cargando('Cargando historial');
  try { estado.historial = await api('historial', { codigo: estado.codigo }); pantallaHistorial(); }
  catch (e) { manejarError(e, cargarHistorial); }
}
function itemsHistorial() {
  const h = estado.historial, items = [];
  h.movimientos.forEach(m => {
    const esAnulacion = m.tipo === 'ANULACION';
    const clase = m.anulado || esAnulacion ? 'neutro' : (m.monto < 0 ? 'gasto' : '');
    const icono = m.anulado || esAnulacion ? 'anulado' : (m.tipo === 'CANJE' ? 'regalo' : 'mas');
    const boton = !m.anulado && !esAnulacion && puede('ANULAR')
      ? `<button class="mini" data-accion="pedirAnular" data-valor="${esc(m.id_movimiento)}">Anular</button>` : '';
    items.push({
      grupo: m.tipo === 'CANJE' ? 'canjes' : 'coins', fecha: m.fecha,
      html: `<div class="item${m.anulado ? ' tachado' : ''}"><div class="icono ${clase}">${ico(icono, 20)}</div>
        <div class="flex"><div class="principal">${esc(m.descripcion)}</div>
        <div class="detalle">${fFecha(m.fecha)} ${fHora(m.fecha)} · ${esc(m.registrado_por)}${m.anulado ? ' · anulado' : ''}</div>${boton}</div>
        <div class="monto ${m.monto < 0 ? 'neg' : 'pos'}">${signo(m.monto)}</div></div>`
    });
  });
  h.prestamos.forEach(p => {
    items.push({
      grupo: 'prestamos', fecha: p.prestado_en,
      html: `<div class="item"><div class="icono prestamo">${ico('herramienta', 20)}</div>
        <div class="flex"><div class="principal">Préstamo: ${esc(p.herramienta)}</div><div class="detalle">${fFecha(p.prestado_en)} · ${esc(p.prestado_por)}</div></div>
        ${p.devuelto_en ? '' : '<span class="pill gasto">Activo</span>'}</div>`
    });
    if (p.devuelto_en) {
      items.push({
        grupo: 'prestamos', fecha: p.devuelto_en,
        html: `<div class="item"><div class="icono neutro">${ico('devolver', 20)}</div>
          <div class="flex"><div class="principal">Devolvió: ${esc(p.herramienta)}</div>
          <div class="detalle">${fFecha(p.devuelto_en)} · ${esc(p.recibido_por || '')}${p.observacion ? ' · obs.: ' + esc(p.observacion) : ''}</div></div></div>`
      });
    }
  });
  return items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
function pantallaHistorial() {
  const f = estado.filtro;
  const items = itemsHistorial().filter(i => f === 'todo' || i.grupo === f);
  const chips = [['todo', 'Todo'], ['coins', 'Coins'], ['canjes', 'Canjes'], ['prestamos', 'Préstamos']]
    .map(([id, l]) => `<button class="chip${f === id ? ' activo' : ''}" data-accion="filtro" data-valor="${id}">${l}</button>`).join('');
  pantalla(`${titulo('Historial')}
    <section class="saldo"><span class="rotulo">Saldo periodo ${esc(estado.historial.periodo)}</span><span class="cifra">${estado.historial.saldo}<small>coins</small></span></section>
    <div class="chips">${chips}</div>
    <div class="lista">${items.map(i => i.html).join('') || '<p class="vacio">Sin registros todavía.</p>'}</div>`);
}
ACC.filtro = v => { estado.filtro = v; pantallaHistorial(); };

aplicarTema();
iniciar();
