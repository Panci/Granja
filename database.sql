-- ERP Animal — SQL Database Schema
-- Compatible with MySQL/MariaDB

-- Drop tables if they exist to allow clean re-import
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `gastos`;
DROP TABLE IF EXISTS `produccion`;
DROP TABLE IF EXISTS `reproduccion`;
DROP TABLE IF EXISTS `tareas`;
DROP TABLE IF EXISTS `dietas`;
DROP TABLE IF EXISTS `tratamientos`;
DROP TABLE IF EXISTS `desparasitaciones`;
DROP TABLE IF EXISTS `vacunas`;
DROP TABLE IF EXISTS `animals`;
DROP TABLE IF EXISTS `especies`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Table: especies
CREATE TABLE `especies` (
  `id` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `icono` VARCHAR(50) NOT NULL DEFAULT '🐾',
  `gestacionDias` INT NOT NULL DEFAULT 30,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_nombre_unique` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: animals
CREATE TABLE `animals` (
  `id` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `especie` VARCHAR(100) NOT NULL,
  `raza` VARCHAR(100) DEFAULT NULL,
  `sexo` ENUM('Macho', 'Hembra') NOT NULL,
  `fechaNacimiento` DATE DEFAULT NULL,
  `estado` ENUM('Activo', 'Vendido', 'Fallecido') NOT NULL DEFAULT 'Activo',
  `notas` TEXT DEFAULT NULL,
  `fechaAlta` DATE DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_animals_especie` FOREIGN KEY (`especie`) REFERENCES `especies` (`nombre`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: vacunas
CREATE TABLE `vacunas` (
  `id` VARCHAR(50) NOT NULL,
  `animalId` VARCHAR(50) NOT NULL,
  `fecha` DATE NOT NULL,
  `tipo` VARCHAR(100) NOT NULL,
  `lote` VARCHAR(100) DEFAULT NULL,
  `proximaDosis` DATE DEFAULT NULL,
  `notas` TEXT DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_vacunas_animalId` FOREIGN KEY (`animalId`) REFERENCES `animals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: desparasitaciones
CREATE TABLE `desparasitaciones` (
  `id` VARCHAR(50) NOT NULL,
  `animalId` VARCHAR(50) NOT NULL,
  `fecha` DATE NOT NULL,
  `tipoIntExt` ENUM('Interna', 'Externa') NOT NULL,
  `producto` VARCHAR(100) NOT NULL,
  `proximaAplicacion` DATE DEFAULT NULL,
  `notas` TEXT DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_desparasitaciones_animalId` FOREIGN KEY (`animalId`) REFERENCES `animals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: tratamientos
CREATE TABLE `tratamientos` (
  `id` VARCHAR(50) NOT NULL,
  `animalId` VARCHAR(50) NOT NULL,
  `fechaInicio` DATE NOT NULL,
  `fechaFin` DATE DEFAULT NULL,
  `tipo` VARCHAR(100) DEFAULT NULL,
  `medicamento` VARCHAR(100) NOT NULL,
  `dosis` VARCHAR(100) DEFAULT NULL,
  `estado` ENUM('Activo', 'Completado', 'Cancelado') NOT NULL DEFAULT 'Activo',
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tratamientos_animalId` FOREIGN KEY (`animalId`) REFERENCES `animals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: dietas
CREATE TABLE `dietas` (
  `id` VARCHAR(50) NOT NULL,
  `grupo` VARCHAR(100) DEFAULT NULL,
  `animalId` VARCHAR(50) DEFAULT NULL,
  `tipoPienso` VARCHAR(100) NOT NULL,
  `cantidad` VARCHAR(50) DEFAULT NULL,
  `unidad` VARCHAR(50) DEFAULT NULL,
  `frecuencia` VARCHAR(50) DEFAULT NULL,
  `notas` TEXT DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_dietas_animalId` FOREIGN KEY (`animalId`) REFERENCES `animals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dietas_grupo` FOREIGN KEY (`grupo`) REFERENCES `especies` (`nombre`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: tareas
CREATE TABLE `tareas` (
  `id` VARCHAR(50) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `grupo` VARCHAR(100) DEFAULT NULL,
  `frecuencia` VARCHAR(50) DEFAULT NULL,
  `proximaEjecucion` DATE DEFAULT NULL,
  `estado` ENUM('Pendiente', 'Completada') NOT NULL DEFAULT 'Pendiente',
  `completadaEn` DATE DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tareas_grupo` FOREIGN KEY (`grupo`) REFERENCES `especies` (`nombre`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: reproduccion
CREATE TABLE `reproduccion` (
  `id` VARCHAR(50) NOT NULL,
  `hembra` VARCHAR(50) NOT NULL,
  `macho` VARCHAR(50) DEFAULT NULL,
  `fechaMonta` DATE NOT NULL,
  `fechaEstimadaParto` DATE DEFAULT NULL,
  `estado` ENUM('En gestación', 'Nacido', 'Perdido', 'Cancelado') NOT NULL DEFAULT 'En gestación',
  `numeroCrias` INT DEFAULT NULL,
  `notasParto` TEXT DEFAULT NULL,
  `exito` BOOLEAN DEFAULT NULL,
  `fechaPartoReal` DATE DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_reproduccion_hembra` FOREIGN KEY (`hembra`) REFERENCES `animals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reproduccion_macho` FOREIGN KEY (`macho`) REFERENCES `animals` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: produccion
CREATE TABLE `produccion` (
  `id` VARCHAR(50) NOT NULL,
  `fecha` DATE NOT NULL,
  `cantidad` INT NOT NULL DEFAULT 0,
  `tipo` VARCHAR(50) NOT NULL DEFAULT 'Huevos',
  `notas` TEXT DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: gastos
CREATE TABLE `gastos` (
  `id` VARCHAR(50) NOT NULL,
  `fecha` DATE NOT NULL,
  `grupo` VARCHAR(100) DEFAULT NULL,
  `categoria` VARCHAR(100) NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `descripcion` VARCHAR(255) DEFAULT NULL,
  `_createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `_updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_gastos_grupo` FOREIGN KEY (`grupo`) REFERENCES `especies` (`nombre`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------
-- SEED DATA (Default species)
-- --------------------------------------------------------

INSERT INTO `especies` (`id`, `nombre`, `icono`, `gestacionDias`) VALUES
('ESP-001', 'Perro', '🐕', 63),
('ESP-002', 'Gato', '🐈', 65),
('ESP-003', 'Pájaro', '🐦', 14),
('ESP-004', 'Gallina', '🐔', 21);

-- --------------------------------------------------------
-- SEED DATA (Demo records)
-- --------------------------------------------------------

INSERT INTO `animals` (`id`, `nombre`, `especie`, `raza`, `sexo`, `fechaNacimiento`, `estado`, `notas`, `fechaAlta`) VALUES
('ANI-001', 'Kira', 'Perro', 'Border Collie', 'Hembra', '2023-04-12', 'Activo', 'Muy inteligente y activa.', '2025-06-01'),
('ANI-002', 'Tom', 'Gato', 'Común Europeo', 'Macho', '2022-08-20', 'Activo', 'Le gusta dormir en el porche.', '2025-06-01'),
('ANI-003', 'Clara', 'Gallina', 'Ponedora', 'Hembra', '2024-02-10', 'Activo', 'Buena productora de huevos.', '2025-06-01');

INSERT INTO `vacunas` (`id`, `animalId`, `fecha`, `tipo`, `lote`, `proximaDosis`, `notas`) VALUES
('VAC-001', 'ANI-001', '2025-06-10', 'Rabia', 'L-55243', '2026-06-10', 'Dosis anual obligatoria');

INSERT INTO `desparasitaciones` (`id`, `animalId`, `fecha`, `tipoIntExt`, `producto`, `proximaAplicacion`, `notas`) VALUES
('DES-001', 'ANI-001', '2025-06-15', 'Externa', 'Frontline Tri-Act', '2025-07-15', 'Pipeta mensual contra pulgas y garrapatas.');

INSERT INTO `dietas` (`id`, `grupo`, `animalId`, `tipoPienso`, `cantidad`, `unidad`, `frecuencia`, `notas`) VALUES
('DIE-001', NULL, 'ANI-001', 'Pienso Premium Active', '300', 'g', '2x al día', 'Repartir en mañana y noche.'),
('DIE-002', 'Gallina', NULL, 'Maíz partido y pienso ponedoras', '120', 'g', 'Ad libitum', 'Mantener comedero siempre limpio.');
