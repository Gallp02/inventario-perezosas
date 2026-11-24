CREATE DATABASE IF NOT EXISTS inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario_db;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  descripcion VARCHAR(255) NULL,
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 5,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  unidad VARCHAR(15) NOT NULL DEFAULT 'pza',
  stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recetas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  insumo_id INT NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uk_receta (producto_id, insumo_id),
  CONSTRAINT fk_receta_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_receta_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  distrito VARCHAR(100) DEFAULT NULL,
  provincia VARCHAR(100) DEFAULT 'Lima',
  telefono VARCHAR(40) DEFAULT NULL,
  direccion VARCHAR(255) DEFAULT NULL,
  notas TEXT,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_nombre (nombre),
  INDEX idx_clientes_distrito (distrito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL,
  cliente_id INT NULL,
  anio_pedido INT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cliente VARCHAR(120) NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'completada',
  estado_pedido VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  notas VARCHAR(255) NULL,
  usuario VARCHAR(80) NOT NULL DEFAULT 'local',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ventas_codigo_anio (codigo, anio_pedido),
  CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS venta_detalles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id) REFERENCES ventas(id),
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_producto (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  tipo VARCHAR(25) NOT NULL,
  cantidad INT NOT NULL,
  anterior INT NOT NULL,
  nuevo INT NOT NULL,
  referencia VARCHAR(80) NULL,
  usuario VARCHAR(80) NOT NULL DEFAULT 'local',
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mp_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_insumo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  insumo_id INT NOT NULL,
  tipo VARCHAR(25) NOT NULL,
  cantidad DECIMAL(12,2) NOT NULL,
  anterior DECIMAL(12,2) NOT NULL,
  nuevo DECIMAL(12,2) NOT NULL,
  referencia VARCHAR(80) NULL,
  usuario VARCHAR(80) NOT NULL DEFAULT 'local',
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mi_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(80) NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_mp_fecha ON movimientos_producto(fecha);
CREATE INDEX idx_mi_fecha ON movimientos_insumo(fecha);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_login_logs_fecha ON login_logs(fecha);

INSERT IGNORE INTO productos (codigo, nombre, categoria, descripcion, precio_venta, stock, stock_minimo) VALUES
('PER-01', 'Perezosa individual', 'Perezosas', 'Perezosa de una plaza con soporte', 180.00, 12, 5),
('PER-02', 'Perezosa doble', 'Perezosas', 'Perezosa de dos plazas con soporte', 320.00, 6, 4),
('TOL-01', 'Toldo 3 x 4 m', 'Toldos', 'Toldo rectangular con armazón', 850.00, 4, 2),
('SOM-01', 'Sombrilla 2.5 m', 'Sombrillas', 'Sombrilla circular con armazón', 260.00, 10, 4);

INSERT IGNORE INTO insumos (codigo, nombre, categoria, unidad, stock, stock_minimo, costo_unitario) VALUES
('ARM-PER', 'Armazón perezosa', 'Armazones', 'pza', 30.00, 8.00, 45.00),
('TELA-PER', 'Tela perezosa', 'Telas', 'm', 80.00, 20.00, 18.00),
('ARM-TOL', 'Armazón toldo', 'Armazones', 'pza', 10.00, 3.00, 220.00),
('TELA-TOL', 'Tela toldo', 'Telas', 'm', 60.00, 15.00, 35.00),
('ARM-SOM', 'Armazón sombrilla', 'Armazones', 'pza', 18.00, 5.00, 80.00),
('TELA-SOM', 'Tela sombrilla', 'Telas', 'm', 40.00, 12.00, 28.00);

INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'PER-01' AND i.codigo = 'ARM-PER';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 3.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'PER-01' AND i.codigo = 'TELA-PER';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 2.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'PER-02' AND i.codigo = 'ARM-PER';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 5.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'PER-02' AND i.codigo = 'TELA-PER';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'TOL-01' AND i.codigo = 'ARM-TOL';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 12.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'TOL-01' AND i.codigo = 'TELA-TOL';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'SOM-01' AND i.codigo = 'ARM-SOM';
INSERT IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 4.00 FROM productos p CROSS JOIN insumos i WHERE p.codigo = 'SOM-01' AND i.codigo = 'TELA-SOM';
