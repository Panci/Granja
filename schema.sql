-- ============================================================
-- ERP Animal — Esquema de base de datos MySQL
-- ============================================================
-- Ejecutar en MySQL/MariaDB antes de la primera carga.
-- CREATE DATABASE erp_animal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE erp_animal;
-- ============================================================

CREATE TABLE IF NOT EXISTS animals (
  id VARCHAR(64) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  especie VARCHAR(64) NOT NULL,
  raza VARCHAR(255) DEFAULT NULL,
  sexo ENUM('Macho', 'Hembra') NOT NULL,
  fechaNacimiento DATE DEFAULT NULL,
  fechaAlta DATE DEFAULT NULL,
  estado ENUM('Activo', 'Vendido', 'Fallecido') DEFAULT 'Activo',
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_especie (especie),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vacunas (
  id VARCHAR(64) PRIMARY KEY,
  animalId VARCHAR(64) NOT NULL,
  fecha DATE NOT NULL,
  tipo VARCHAR(255) NOT NULL,
  lote VARCHAR(255) DEFAULT NULL,
  proximaDosis DATE DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_animal (animalId),
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS desparasitaciones (
  id VARCHAR(64) PRIMARY KEY,
  animalId VARCHAR(64) NOT NULL,
  fecha DATE NOT NULL,
  tipoIntExt ENUM('Interna', 'Externa') NOT NULL,
  producto VARCHAR(255) NOT NULL,
  proximaAplicacion DATE DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_animal (animalId),
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tratamientos (
  id VARCHAR(64) PRIMARY KEY,
  animalId VARCHAR(64) NOT NULL,
  fechaInicio DATE NOT NULL,
  fechaFin DATE DEFAULT NULL,
  tipo VARCHAR(255) DEFAULT NULL,
  medicamento VARCHAR(255) DEFAULT NULL,
  dosis VARCHAR(255) DEFAULT NULL,
  estado ENUM('Activo', 'Completado', 'Cancelado') DEFAULT 'Activo',
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_animal (animalId),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reproduccion (
  id VARCHAR(64) PRIMARY KEY,
  hembra VARCHAR(64) NOT NULL,
  macho VARCHAR(64) DEFAULT NULL,
  fechaMonta DATE NOT NULL,
  fechaEstimadaParto DATE DEFAULT NULL,
  estado ENUM('Gestante', 'Parto Reciente', 'Monta sin éxito', 'Cancelado') DEFAULT 'Gestante',
  numeroCrias INT DEFAULT NULL,
  exito TINYINT(1) DEFAULT NULL,
  fechaParto DATE DEFAULT NULL,
  notasParto TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hembra (hembra),
  INDEX idx_macho (macho),
  INDEX idx_fecha (fechaMonta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alimentacion (
  id VARCHAR(64) PRIMARY KEY,
  animalId VARCHAR(64) DEFAULT NULL,
  grupo VARCHAR(64) DEFAULT NULL,
  tipoPienso VARCHAR(255) DEFAULT NULL,
  cantidad VARCHAR(64) DEFAULT NULL,
  unidad VARCHAR(32) DEFAULT NULL,
  frecuencia VARCHAR(64) DEFAULT NULL,
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_animal (animalId),
  INDEX idx_grupo (grupo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tareas (
  id VARCHAR(64) PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  grupo VARCHAR(64) DEFAULT NULL,
  animalId VARCHAR(64) DEFAULT NULL,
  frecuencia VARCHAR(64) DEFAULT NULL,
  proximaEjecucion DATE DEFAULT NULL,
  completada TINYINT(1) DEFAULT 0,
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proxima (proximaEjecucion),
  INDEX idx_completada (completada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS produccion (
  id VARCHAR(64) PRIMARY KEY,
  fecha DATE NOT NULL,
  cantidad INT NOT NULL,
  tipo VARCHAR(64) DEFAULT 'Huevos',
  notas TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos (
  id VARCHAR(64) PRIMARY KEY,
  fecha DATE NOT NULL,
  categoria VARCHAR(64) NOT NULL,
  grupo VARCHAR(64) DEFAULT NULL,
  descripcion VARCHAR(255) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  data JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fecha (fecha),
  INDEX idx_categoria (categoria),
  INDEX idx_grupo (grupo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS especies (
  id VARCHAR(64) PRIMARY KEY,
  nombre VARCHAR(64) NOT NULL UNIQUE,
  icono VARCHAR(16) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Datos iniciales
-- ============================================================
INSERT INTO especies (nombre, icono) VALUES
  ('Perro', '��'),
  ('Gato', '��'),
  ('Gallina', '��'),
  ('Conejo', '��'),
  ('Caballo', '��'),
  ('Vaca', '��'),
  ('Cabra', '��'),
  ('Oveja', '��'),
  ('Cerdo', '��'),
  ('Pájaro', '��')
ON DUPLICATE KEY UPDATE icono = VALUES(icono);
