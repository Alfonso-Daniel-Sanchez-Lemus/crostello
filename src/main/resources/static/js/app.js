(() => {
  const $ = (id) => document.getElementById(id);
  const CART_KEY = 'crostello_carrito';

  let config = {};
  let grupos = [];
  let categorias = [];
  let productos = [];
  let carrito = cargarCarrito(); // { "idProducto:indiceOpcion": cantidad }

  const dinero = (n) => '$' + Math.round(n).toLocaleString('es-CO');

  function cargarCarrito() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; }
  }
  function guardarCarrito() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(carrito)); } catch { /* sin almacenamiento */ }
  }

  // Una "línea" del carrito: producto + opción (Personal/Mediana) si la tiene
  function linea(key) {
    const [id, v] = key.split(':');
    const p = productos.find((x) => String(x.id) === id);
    if (!p) return null;
    const op = p.opciones ? p.opciones[Number(v)] : null;
    if (p.opciones && !op) return null;
    return {
      key,
      nombre: op ? `${p.nombre} (${op.nombre})` : p.nombre,
      precio: op ? op.precio : p.precio,
      cantidad: carrito[key],
    };
  }

  async function init() {
    const [cfg, menu] = await Promise.all([
      fetch('data/config.json').then((r) => r.json()),
      fetch('data/menu.json').then((r) => r.json()),
    ]);
    config = cfg;
    ({ grupos, categorias, productos } = menu);

    for (const k of Object.keys(carrito)) if (!linea(k)) delete carrito[k];

    $('pie').innerHTML =
      `<a href="${esc(config.mapa)}" target="_blank" rel="noopener">📍 ${esc(config.direccion)}</a><br>` +
      `<a href="https://wa.me/${esc(config.whatsapp)}" target="_blank" rel="noopener">WhatsApp ${esc(config.telefono)}</a> · ` +
      `<a href="https://instagram.com/${esc(config.instagram)}" target="_blank" rel="noopener">@${esc(config.instagram)}</a>`;

    renderTabs();
    renderMenu();
    renderCarrito();
    eventos();
  }

  function renderTabs() {
    $('tabs').innerHTML = grupos
      .map((g, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-grupo="${g.id}">${g.icono} ${g.nombre}</button>`)
      .join('');
  }

  function tarjeta(p) {
    const boton = (key, etiqueta, precio) =>
      `<button class="add-btn" data-add="${key}" aria-label="Agregar ${esc(etiqueta)} ${dinero(precio)}">` +
      `<span class="info"><span class="et">${esc(etiqueta)}</span><span class="p">${dinero(precio)}</span></span>` +
      `<span class="mas" aria-hidden="true">+</span></button>`;
    const botones = p.opciones
      ? p.opciones.map((o, i) => boton(`${p.id}:${i}`, o.nombre, o.precio)).join('')
      : boton(`${p.id}:0`, 'Agregar', p.precio);
    return `
      <article class="card">
        <h4>${esc(p.nombre)}</h4>
        ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
        <div class="acciones">${botones}</div>
      </article>`;
  }

  function renderMenu() {
    $('menu').innerHTML = grupos.map((g) => `
      <section id="grupo-${g.id}">
        <h2 class="grupo-title">${g.icono} ${g.nombre}</h2>
        ${categorias.filter((c) => c.grupo === g.id).map((c) => `
          ${c.nombre === g.nombre && !c.nota ? '' : `<h3 class="cat-title">${esc(c.nombre)}${c.nota ? `<small>${esc(c.nota)}</small>` : ''}</h3>`}
          <div class="grid">${productos.filter((p) => p.categoria === c.id).map(tarjeta).join('')}</div>
        `).join('')}
      </section>`).join('');
  }

  function renderCarrito() {
    const lineas = Object.keys(carrito).map(linea).filter(Boolean);
    const cantidad = lineas.reduce((s, l) => s + l.cantidad, 0);
    const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);

    $('items').innerHTML = lineas.map((l) => `
      <li class="item">
        <div class="item-info"><strong>${esc(l.nombre)}</strong><span>${dinero(l.precio)} c/u · ${dinero(l.precio * l.cantidad)}</span></div>
        <div class="qty">
          <button data-menos="${l.key}" aria-label="Quitar uno">−</button>
          <span>${l.cantidad}</span>
          <button data-mas="${l.key}" aria-label="Agregar uno">+</button>
        </div>
      </li>`).join('');

    $('vacio').hidden = cantidad > 0;
    $('formulario').hidden = cantidad === 0;
    $('enviar').disabled = cantidad === 0;
    $('vaciar').hidden = cantidad === 0;
    $('total').textContent = dinero(total);
    $('fabCantidad').textContent = cantidad;
    $('fabTotal').textContent = cantidad ? dinero(total) : '';
  }

  function cambiar(key, delta) {
    const nueva = (carrito[key] || 0) + delta;
    if (nueva <= 0) delete carrito[key]; else carrito[key] = nueva;
    guardarCarrito();
    renderCarrito();
  }

  function abrir(v) {
    $('drawer').classList.toggle('show', v);
    $('overlay').classList.toggle('show', v);
  }

  function armarMensaje() {
    const lineas = Object.keys(carrito).map(linea).filter(Boolean);
    const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
    const tipo = document.querySelector('input[name=tipo]:checked').value;
    const nombre = $('cliente').value.trim();
    const dir = $('direccion').value.trim();
    const notas = $('notas').value.trim();

    return [
      `Hola ${config.nombre}, quiero hacer un pedido:`,
      '',
      ...lineas.map((l) => `• ${l.cantidad} x ${l.nombre} — ${dinero(l.precio * l.cantidad)}`),
      '',
      `*Total: ${dinero(total)}*`,
      tipo === 'Entrega a domicilio' ? '(sin domicilio)' : null,
      `Tipo: ${tipo}`,
      tipo === 'Entrega a domicilio' ? 'Domicilio: por favor confírmenme el valor' : null,
      nombre ? `Nombre: ${nombre}` : null,
      tipo === 'Entrega a domicilio' && dir ? `Dirección: ${dir}` : null,
      notas ? `Notas: ${notas}` : null,
    ].filter((l) => l !== null).join('\n');
  }

  function enviar() {
    const tipo = document.querySelector('input[name=tipo]:checked').value;
    if (tipo === 'Entrega a domicilio' && !$('direccion').value.trim()) {
      $('direccion').focus();
      return;
    }
    window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(armarMensaje())}`, '_blank', 'noopener');

    // Pedido enviado: el carrito y las notas empiezan de cero (el nombre y la dirección se conservan)
    carrito = {};
    guardarCarrito();
    $('notas').value = '';
    renderCarrito();
    abrir(false);
  }

  function eventos() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.add) {
        cambiar(t.dataset.add, 1);
        const fab = $('abrirCarrito');
        fab.classList.remove('bump');
        void fab.offsetWidth;
        fab.classList.add('bump');
      }
      if (t.dataset.mas) cambiar(t.dataset.mas, 1);
      if (t.dataset.menos) cambiar(t.dataset.menos, -1);
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
    $('vaciar').onclick = () => { carrito = {}; guardarCarrito(); renderCarrito(); };
    $('enviar').onclick = enviar;
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
