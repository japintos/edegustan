# Degustan Drink-Store

admin / admin123

Ecommerce profesional para una tienda de bebidas, integrado con la base MariaDB existente de Degustan.

## Desarrollo

Desarrollado por Pintos Julio y Agustin Burgos para [WebXpert](https://www.webxpert.com.ar).

## Stack

- Backend: Node.js, Express, TypeScript, Sequelize, MariaDB.
- Frontend: React, TypeScript, Vite, Redux Toolkit.
- Seguridad: bcrypt, JWT, Helmet, CORS, rate limit y validaciones con express-validator.
- Integraciones listas por credenciales: SMTP, Cloudinary por URL de imagen, Mercado Pago.

## Estructura

```text
client/                    Frontend React
server/                    API Express
database/ecommerce_update.sql  SQL incremental para HeidiSQL
database/client_user_link_update.sql  SQL para vincular usuarios web con clientes comerciales
database/account_profile_update.sql  SQL para habilitar foto de perfil de usuarios
degustandb.sql             Dump original de la BD existente
```

## Base de datos

1. Importar `degustandb.sql` en MariaDB si la base aun no existe.
2. Ejecutar `database/ecommerce_update.sql` en HeidiSQL sobre `degustan_db`.
3. Ejecutar `database/client_user_link_update.sql` si la base ya estaba actualizada antes de vincular clientes con usuarios.
4. Ejecutar `database/account_profile_update.sql` si la base ya estaba actualizada antes de agregar foto de perfil.

El SQL incremental:

- Agrega rol `cliente`.
- Agrega campos de verificacion de email por codigo de 4 digitos y perfil web en `usuarios`.
- Agrega campos ecommerce en `productos`.
- Reutiliza `ventas` y `detalles_venta` para pedidos web.
- Crea `carritos`, `carrito_items` y `transacciones_pago`.
- Vincula cuentas web con fichas comerciales mediante `clientes.usuario_id`.

## Configuracion

Copiar los archivos de ejemplo:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Configurar `server/.env`:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- `JWT_SECRET` con un valor privado.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Datos bancarios `BANK_ACCOUNT_*`.
- `MERCADOPAGO_ACCESS_TOKEN` cuando se active la pasarela.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` para subir imagenes desde el panel administrativo.

Las imagenes se suben a Cloudinary desde el panel administrativo. La aplicacion guarda solo la URL segura en `productos.imagen_url`.

## Instalacion

```bash
npm install
npm run dev
```

La API queda en `http://localhost:4000/api` y el frontend en `http://localhost:5173`.

## Scripts

```bash
npm run dev       # API + web
npm run build     # Compila backend y frontend
npm run start     # Ejecuta API compilada
npm run lint      # Lint del frontend
```

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify-email?token=...`
- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/cart`
- `POST /api/cart/items`
- `POST /api/orders/checkout`
- `GET /api/orders`
- `POST /api/contact`
- `GET /api/admin/stats`

## Notas operativas

- Los usuarios administradores se toman del rol existente `admin`.
- Los clientes nuevos se crean con rol `cliente` y deben validar un codigo numerico enviado por email antes de iniciar sesion.
- Las compras descuentan stock y registran movimientos en `movimientos_stock`.
- Para Mercado Pago, si no hay token configurado se crea el pedido y la transaccion queda pendiente sin URL de checkout.
