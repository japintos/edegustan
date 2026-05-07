  USE `degustan_db`;

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
