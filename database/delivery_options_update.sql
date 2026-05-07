USE `degustan_db`;

ALTER TABLE `ventas`
  ADD COLUMN IF NOT EXISTS `tipo_entrega` enum('delivery','retiro') DEFAULT 'delivery' AFTER `telefono_contacto`,
  ADD COLUMN IF NOT EXISTS `entrega_desde` timestamp NULL DEFAULT NULL AFTER `tipo_entrega`,
  ADD COLUMN IF NOT EXISTS `entrega_hasta` timestamp NULL DEFAULT NULL AFTER `entrega_desde`,
  ADD COLUMN IF NOT EXISTS `delivery_a_cargo_comprador` tinyint(1) NOT NULL DEFAULT 1 AFTER `entrega_hasta`;

ALTER TABLE `transacciones_pago`
  MODIFY COLUMN `proveedor` enum('transferencia','mercadopago','efectivo') NOT NULL;

CREATE INDEX IF NOT EXISTS `idx_ventas_tipo_entrega` ON `ventas` (`tipo_entrega`);
