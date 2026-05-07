USE `degustan_db`;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;

-- Roles web: se conserva admin existente y se agrega el rol cliente.
INSERT INTO `roles` (`nombre`, `descripcion`, `permisos`)
SELECT 'cliente', 'Cliente ecommerce', '{"ecommerce": true}'
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `nombre` = 'cliente');

-- Campos necesarios para registro web, validacion por email y perfil de compra.
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `email_verificado` tinyint(1) NOT NULL DEFAULT 0 AFTER `email`,
  ADD COLUMN IF NOT EXISTS `email_verification_token` varchar(255) DEFAULT NULL AFTER `email_verificado`,
  ADD COLUMN IF NOT EXISTS `email_verification_expires` timestamp NULL DEFAULT NULL AFTER `email_verification_token`,
  ADD COLUMN IF NOT EXISTS `password_reset_token` varchar(255) DEFAULT NULL AFTER `email_verification_expires`,
  ADD COLUMN IF NOT EXISTS `password_reset_expires` timestamp NULL DEFAULT NULL AFTER `password_reset_token`,
  ADD COLUMN IF NOT EXISTS `telefono` varchar(30) DEFAULT NULL AFTER `apellido`,
  ADD COLUMN IF NOT EXISTS `direccion` text DEFAULT NULL AFTER `telefono`,
  ADD COLUMN IF NOT EXISTS `perfil_imagen_url` varchar(500) DEFAULT NULL AFTER `direccion`;

CREATE UNIQUE INDEX IF NOT EXISTS `idx_usuarios_email_unique` ON `usuarios` (`email`);
CREATE INDEX IF NOT EXISTS `idx_usuarios_verificacion` ON `usuarios` (`email_verification_token`);

-- Relacion 1 a 1 opcional entre cuenta web y ficha comercial.
ALTER TABLE `clientes`
  ADD COLUMN IF NOT EXISTS `usuario_id` int(11) DEFAULT NULL AFTER `id`;

CREATE UNIQUE INDEX IF NOT EXISTS `idx_clientes_usuario_id` ON `clientes` (`usuario_id`);
CREATE INDEX IF NOT EXISTS `idx_clientes_email` ON `clientes` (`email`);

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND CONSTRAINT_NAME = 'clientes_usuario_fk'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `clientes` ADD CONSTRAINT `clientes_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL',
  'SELECT ''clientes_usuario_fk already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Campos ecommerce para productos existentes: Cloudinary guarda la imagen, la BD solo la URL.
ALTER TABLE `productos`
  ADD COLUMN IF NOT EXISTS `destacado` tinyint(1) NOT NULL DEFAULT 0 AFTER `activo`,
  ADD COLUMN IF NOT EXISTS `slug` varchar(220) DEFAULT NULL AFTER `nombre`;

CREATE INDEX IF NOT EXISTS `idx_productos_catalogo` ON `productos` (`activo`, `categoria_id`, `precio_venta`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_productos_slug_unique` ON `productos` (`slug`);

-- Ventas online: se reutiliza ventas/detalles_venta y se agregan metadatos de ecommerce.
ALTER TABLE `ventas`
  MODIFY COLUMN `metodo_pago` enum('efectivo','tarjeta','transferencia','mercadopago') DEFAULT 'efectivo',
  MODIFY COLUMN `estado` enum('pendiente','completada','cancelada','pagada','preparando','enviada','entregada') DEFAULT 'pendiente',
  MODIFY COLUMN `caja_id` int(11) NULL,
  ADD COLUMN IF NOT EXISTS `origen` enum('local','web') NOT NULL DEFAULT 'local' AFTER `numero_factura`,
  ADD COLUMN IF NOT EXISTS `direccion_envio` text DEFAULT NULL AFTER `costo_envio`,
  ADD COLUMN IF NOT EXISTS `email_contacto` varchar(120) DEFAULT NULL AFTER `direccion_envio`,
  ADD COLUMN IF NOT EXISTS `telefono_contacto` varchar(30) DEFAULT NULL AFTER `email_contacto`,
  ADD COLUMN IF NOT EXISTS `tipo_entrega` enum('delivery','retiro') DEFAULT 'delivery' AFTER `telefono_contacto`,
  ADD COLUMN IF NOT EXISTS `entrega_desde` timestamp NULL DEFAULT NULL AFTER `tipo_entrega`,
  ADD COLUMN IF NOT EXISTS `entrega_hasta` timestamp NULL DEFAULT NULL AFTER `entrega_desde`,
  ADD COLUMN IF NOT EXISTS `delivery_a_cargo_comprador` tinyint(1) NOT NULL DEFAULT 1 AFTER `entrega_hasta`;

CREATE INDEX IF NOT EXISTS `idx_ventas_origen_estado` ON `ventas` (`origen`, `estado`);
CREATE INDEX IF NOT EXISTS `idx_ventas_tipo_entrega` ON `ventas` (`tipo_entrega`);

CREATE TABLE IF NOT EXISTS `carritos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `estado` enum('activo','convertido','abandonado') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_carritos_usuario_estado` (`usuario_id`, `estado`),
  CONSTRAINT `carritos_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `carrito_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `carrito_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_carrito_producto` (`carrito_id`, `producto_id`),
  CONSTRAINT `carrito_items_carrito_fk` FOREIGN KEY (`carrito_id`) REFERENCES `carritos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `carrito_items_producto_fk` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `transacciones_pago` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venta_id` int(11) NOT NULL,
  `proveedor` enum('transferencia','mercadopago','efectivo') NOT NULL,
  `estado` enum('pendiente','aprobado','rechazado','cancelado') NOT NULL DEFAULT 'pendiente',
  `monto` decimal(10,2) NOT NULL,
  `referencia_externa` varchar(255) DEFAULT NULL,
  `checkout_url` varchar(500) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_transacciones_venta` (`venta_id`),
  KEY `idx_transacciones_externa` (`referencia_externa`),
  CONSTRAINT `transacciones_pago_venta_fk` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `transacciones_pago`
  MODIFY COLUMN `proveedor` enum('transferencia','mercadopago','efectivo') NOT NULL;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
