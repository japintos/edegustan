USE `degustan_db`;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `perfil_imagen_url` varchar(500) DEFAULT NULL AFTER `direccion`;
