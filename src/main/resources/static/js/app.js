(() => {
  const $ = (id) => document.getElementById(id);
  const CART_KEY = 'crostello_pedido';

  let config = {};
  let grupos = [];
  let categorias = [];
  let productos = [];
  // Cada unidad pedida es su propia línea, con su nota: [{ id, key: "idProducto:indiceOpcion", nota }]
  let carrito = cargarCarrito();
  const notaAbierta = new Set(); // ids de líneas con el campo de nota desplegado

  const dinero = (n) => '$' + Math.round(n).toLocaleString('es-CO');
  const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function cargarCarrito() {
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(c) ? c : [];
    } catch { return []; }
  }
  function guardarCarrito() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(carrito)); } catch { /* sin almacenamiento */ }
  }

  // Producto + opción (Personal/Mediana) si la tiene
  function detalle(key) {
    const [id, v] = key.split(':');
    const p = productos.find((x) => String(x.id) === id);
    if (!p) return null;
    const op = p.opciones ? p.opciones[Number(v)] : null;
    if (p.opciones && !op) return null;
    const cat = categorias.find((c) => c.id === p.categoria);
    return {
      nombre: op ? `${p.nombre} (${op.nombre})` : p.nombre,
      categoria: cat ? (cat.etiqueta || cat.nombre) : '',
      precio: op ? op.precio : p.precio,
    };
  }

  // Líneas listas para mostrar; si un producto se repite, cada una lleva su número ("2 de 3")
  function lineas() {
    const validas = carrito.map((c) => ({ ...c, ...detalle(c.key) })).filter((l) => l.nombre);
    const total = {};
    validas.forEach((l) => { total[l.key] = (total[l.key] || 0) + 1; });
    const visto = {};
    return validas.map((l) => {
      visto[l.key] = (visto[l.key] || 0) + 1;
      return { ...l, etiqueta: total[l.key] > 1 ? `${l.nombre} (${visto[l.key]} de ${total[l.key]})` : l.nombre };
    });
  }

  async function init() {
    const [cfg, menu] = await Promise.all([
      fetch('data/config.json').then((r) => r.json()),
      fetch('data/menu.json').then((r) => r.json()),
    ]);
    config = cfg;
    ({ grupos, categorias, productos } = menu);

    carrito = carrito.filter((c) => detalle(c.key));

    $('pie').innerHTML =
      `<a href="${esc(config.mapa)}" target="_blank" rel="noopener">${esc(config.direccion)}</a><br>` +
      `<a href="https://wa.me/${esc(config.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(config.telefono)}</a> · ` +
      `<a href="https://instagram.com/${esc(config.instagram)}" target="_blank" rel="noopener">@${esc(config.instagram)}</a>`;

    renderTabs();
    renderMenu();
    renderCarrito();
    eventos();
  }

  function renderTabs() {
    $('tabs').innerHTML = grupos
      .map((g, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-grupo="${g.id}">${esc(g.nombre)}</button>`)
      .join('');
  }

  function tarjeta(p) {
    const boton = (key, etiqueta, precio) =>
      `<button class="add-btn" data-add="${key}" aria-label="Agregar ${esc(etiqueta)} ${dinero(precio)}">` +
      `<span class="info"><span class="et">${p.opciones ? esc(etiqueta) : ''}</span><span class="p">${dinero(precio)}</span></span>` +
      `<span class="mas" aria-hidden="true">+</span></button>`;
    const botones = p.opciones
      ? p.opciones.map((o, i) => boton(`${p.id}:${i}`, o.nombre, o.precio)).join('')
      : boton(`${p.id}:0`, 'Agregar', p.precio);
    return `
      <article class="plato${p.opciones ? ' con-opciones' : ''}">
        <div>
          <h4>${esc(p.nombre)}</h4>
          ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
        </div>
        <div class="acciones">${botones}</div>
      </article>`;
  }

  function renderMenu() {
    $('menu').innerHTML = grupos.map((g) => `
      <section id="grupo-${g.id}">
        <h2 class="grupo-title">${esc(g.nombre)}</h2>
        ${categorias.filter((c) => c.grupo === g.id).map((c) => `
          ${c.nombre === g.nombre && !c.nota ? '' : `<h3 class="cat-title">${esc(c.nombre)}${c.nota ? `<small>${esc(c.nota)}</small>` : ''}</h3>`}
          <div class="lista">${productos.filter((p) => p.categoria === c.id).map(tarjeta).join('')}</div>
        `).join('')}
      </section>`).join('');
  }

  function renderCarrito() {
    const ls = lineas();
    const cantidad = ls.length;
    const total = ls.reduce((s, l) => s + l.precio, 0);

    $('items').innerHTML = ls.map((l) => `
      <li class="item">
        <div class="item-info"><strong>${esc(l.etiqueta)}</strong><span>${l.categoria ? esc(l.categoria) + ' · ' : ''}${dinero(l.precio)}</span></div>
        <button class="quitar" data-quitar="${l.id}" aria-label="Quitar ${esc(l.etiqueta)}">Quitar</button>
        ${l.nota || notaAbierta.has(l.id)
          ? `<input class="nota-item" type="text" data-nota-input="${l.id}" value="${esc(l.nota || '')}" maxlength="140" placeholder="Escribe la nota de este producto" aria-label="Nota para ${esc(l.etiqueta)}">`
          : `<button class="nota-btn" data-nota="${l.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><span>Agregar nota <small>(sin cebolla, extra queso…)</small></span></button>`}
      </li>`).join('');

    $('vacio').hidden = cantidad > 0;
    $('formulario').hidden = cantidad === 0;
    $('enviar').disabled = cantidad === 0;
    $('vaciar').hidden = cantidad === 0;
    $('total').textContent = dinero(total);
    $('fabCantidad').textContent = cantidad;
    $('fabTotal').textContent = cantidad ? dinero(total) : '';
  }

  function agregar(key) {
    carrito.push({ id: nuevoId(), key, nota: '' });
    guardarCarrito();
    renderCarrito();
  }
  function quitar(id) {
    carrito = carrito.filter((c) => c.id !== id);
    notaAbierta.delete(id);
    guardarCarrito();
    renderCarrito();
  }
  function vaciarCarrito() {
    carrito = [];
    notaAbierta.clear();
    guardarCarrito();
    renderCarrito();
  }

  function abrir(v) {
    $('drawer').classList.toggle('show', v);
    $('overlay').classList.toggle('show', v);
  }

  function armarMensaje() {
    const ls = lineas();
    const total = ls.reduce((s, l) => s + l.precio, 0);
    const tipo = document.querySelector('input[name=tipo]:checked').value;
    const nombre = $('cliente').value.trim();
    const dir = $('direccion').value.trim();
    const notas = $('notas').value.trim();

    return [
      `Hola ${config.nombre}, quiero hacer un pedido:`,
      '',
      ...ls.flatMap((l) => [
        `• ${l.categoria ? l.categoria + ': ' : ''}${l.etiqueta} — ${dinero(l.precio)}`,
        (l.nota || '').trim() ? `   Nota: ${l.nota.trim()}` : null,
      ]),
      '',
      `*Total: ${dinero(total)}*`,
      tipo === 'Entrega a domicilio' ? '(sin domicilio)' : null,
      `Tipo: ${tipo}`,
      tipo === 'Entrega a domicilio' ? 'Domicilio: por favor confírmenme el valor' : null,
      nombre ? `Nombre: ${nombre}` : null,
      tipo === 'Entrega a domicilio' && dir ? `Dirección: ${dir}` : null,
      notas ? `Notas generales: ${notas}` : null,
    ].filter((l) => l !== null).join('\n');
  }

  // Al pulsar "Enviar": primero se muestra un resumen para revisar el pedido y las notas
  function revisar() {
    const tipo = document.querySelector('input[name=tipo]:checked').value;
    if (tipo === 'Entrega a domicilio' && !$('direccion').value.trim()) {
      $('direccion').focus();
      return;
    }
    const ls = lineas();
    const total = ls.reduce((s, l) => s + l.precio, 0);
    $('resumen').innerHTML = ls.map((l) => `
      <li>
        <div class="r-fila"><span>${l.categoria ? esc(l.categoria) + ': ' : ''}<strong>${esc(l.etiqueta)}</strong></span><span>${dinero(l.precio)}</span></div>
        ${(l.nota || '').trim() ? `<p class="r-nota">Nota: ${esc(l.nota.trim())}</p>` : '<p class="r-sin">Sin nota</p>'}
      </li>`).join('');
    const dir = $('direccion').value.trim();
    $('resumenPie').innerHTML = `<strong>Total: ${dinero(total)}</strong><br>${esc(tipo)}${tipo === 'Entrega a domicilio' && dir ? ': ' + esc(dir) : ''}`;
    $('confirmar').showModal();
  }

  function enviar() {
    $('confirmar').close();
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(armarMensaje())}`, '_blank', 'noopener');

    // Pedido enviado: el carrito y las notas empiezan de cero (el nombre y la dirección se conservan)
    $('notas').value = '';
    vaciarCarrito();
    abrir(false);
  }

  function eventos() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.add) {
        agregar(t.dataset.add);
        const fab = $('abrirCarrito');
        fab.classList.remove('bump');
        void fab.offsetWidth;
        fab.classList.add('bump');
      }
      if (t.dataset.quitar) quitar(t.dataset.quitar);
      if (t.dataset.nota) {
        notaAbierta.add(t.dataset.nota);
        renderCarrito();
        document.querySelector(`[data-nota-input="${t.dataset.nota}"]`)?.focus();
      }
      if (t.dataset.grupo) $('grupo-' + t.dataset.grupo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Marca la pestaña según la sección visible
    const obs = new IntersectionObserver((entradas) => {
      for (const en of entradas) {
        if (en.isIntersecting) {
          const id = en.target.id.replace('grupo-', '');
          document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.grupo === id));
        }
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    grupos.forEach((g) => obs.observe($('grupo-' + g.id)));

    $('abrirCarrito').onclick = () => abrir(true);
    $('cerrarCarrito').onclick = () => abrir(false);
    $('overlay').onclick = () => abrir(false);
    $('vaciar').onclick = vaciarCarrito;
    $('items').addEventListener('input', (e) => {
      const id = e.target.dataset.notaInput;
      const c = carrito.find((x) => x.id === id);
      if (!c) return;
      c.nota = e.target.value;
      guardarCarrito();
    });
    $('enviar').onclick = revisar;
    $('confirmarEnviar').onclick = enviar;
    $('confirmarVolver').onclick = () => $('confirmar').close();
    $('confirmar').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    document.querySelectorAll('input[name=tipo]').forEach((r) => r.onchange = () => {
      const domicilio = document.querySelector('input[name=tipo]:checked').value === 'Entrega a domicilio';
      $('dirWrap').hidden = !domicilio;
      $('avisoDomicilio').hidden = !domicilio;
    });
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  init();
})();
