# Crostello – Menú y pedidos por WhatsApp

Carta digital de Crostello (Bucaramanga) con carrito que envía el pedido por WhatsApp.

## Cómo funciona

- **Pedido por WhatsApp:** el cliente arma su carrito, elige recoger o domicilio, y al pulsar "Enviar pedido por WhatsApp" se abre un enlace directo (`wa.me`) al número del local con el pedido ya escrito: productos, cantidades, total, tipo de entrega, nombre, dirección y notas. El pedido se confirma por ese chat.
- **Domicilio:** su valor no se incluye en el total; el local lo confirma por WhatsApp según la dirección.

## Tecnologías

- **Java 21 + Spring Boot 3.4 (Maven):** proyecto base que sirve el sitio en local (`CrustenoApplication` y la carpeta `src/main/java`).
- **HTML, CSS y JavaScript:** el menú, el carrito y el enlace a WhatsApp, sin dependencias externas, en `src/main/resources/static/`.
- **Netlify:** publicación del sitio, que se actualiza con cada cambio en `main`.

## Archivos principales

- `static/index.html`, `static/css/styles.css`, `static/js/app.js`: página, estilos y lógica del carrito.
- `static/data/menu.json`: productos y precios.
- `static/data/config.json`: datos del local (WhatsApp, dirección, Instagram, mapa).

## Correr en local

Con Java 21: `./mvnw spring-boot:run` y abrir http://localhost:8080
