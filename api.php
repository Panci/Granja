<?php
// ============================================================
// api.php — API REST para ERP Animal
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load database configuration
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$collection = $_GET['collection'] ?? '';

// Whitelist of allowed database tables
$valid_collections = [
    'animals', 
    'vacunas', 
    'desparasitaciones', 
    'tratamientos', 
    'dietas', 
    'tareas', 
    'reproduccion', 
    'produccion', 
    'gastos', 
    'especies'
];

// 1. Action: fetch_all (GET)
// Descarga todas las tablas de una sola vez al iniciar la aplicación
if ($action === 'fetch_all') {
    try {
        $data = [];
        foreach ($valid_collections as $col) {
            $stmt = $pdo->query("SELECT * FROM `$col`");
            $data[$col] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        echo json_encode([
            "success" => true,
            "data" => $data
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Error al obtener datos: " . $e->getMessage()
        ]);
    }
    exit;
}

// 5. Action: import (POST)
// Reemplaza todos los datos de la BD con el JSON de un backup importado
if ($action === 'import') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Datos de importación vacíos"]);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        // Desactivar restricciones de clave foránea temporalmente
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        foreach ($valid_collections as $col) {
            $pdo->exec("TRUNCATE TABLE `$col`");
        }
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        // Insertar datos importados
        foreach ($valid_collections as $col) {
            if (isset($input[$col]) && is_array($input[$col])) {
                foreach ($input[$col] as $item) {
                    $keys = array_keys($item);
                    $cols = implode(", ", array_map(function($k) { return "`$k`"; }, $keys));
                    $placeholders = implode(", ", array_map(function($k) { return ":$k"; }, $keys));
                    
                    $stmt = $pdo->prepare("INSERT INTO `$col` ($cols) VALUES ($placeholders)");
                    
                    foreach ($item as $k => $v) {
                        if (is_bool($v)) {
                            $stmt->bindValue(":$k", $v ? 1 : 0, PDO::PARAM_INT);
                        } else {
                            $stmt->bindValue(":$k", $v);
                        }
                    }
                    $stmt->execute();
                }
            }
        }
        
        $pdo->commit();
        echo json_encode(["success" => true]);
    } catch (\Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "error" => "Error al importar datos en la BD: " . $e->getMessage()
        ]);
    }
    exit;
}

// For all other actions, we need a valid collection
if (!in_array($collection, $valid_collections)) {
    http_response_code(400);
    echo json_encode([
        "success" => false, 
        "error" => "Colección no válida"
    ]);
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);

// 2. Action: create (POST)
if ($action === 'create') {
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Datos de entrada vacíos"]);
        exit;
    }

    try {
        $keys = array_keys($input);
        $cols = implode(", ", array_map(function($k) { return "`$k`"; }, $keys));
        $placeholders = implode(", ", array_map(function($k) { return ":$k"; }, $keys));
        
        $sql = "INSERT INTO `$collection` ($cols) VALUES ($placeholders)";
        $stmt = $pdo->prepare($sql);
        
        // Bind values cleanly
        foreach ($input as $key => $val) {
            // Convert booleans to 1/0 for MySQL TINYINT
            if (is_bool($val)) {
                $stmt->bindValue(":$key", $val ? 1 : 0, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(":$key", $val);
            }
        }
        
        $stmt->execute();
        
        echo json_encode(["success" => true]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "error" => "Error al insertar registro: " . $e->getMessage()
        ]);
    }
    exit;
}

// 3. Action: update (POST / PUT)
if ($action === 'update') {
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Datos inválidos o falta el ID"]);
        exit;
    }

    try {
        $id = $input['id'];
        unset($input['id']); // Don't update the ID column
        
        if (empty($input)) {
            echo json_encode(["success" => true, "message" => "Nada que actualizar"]);
            exit;
        }

        $sets = [];
        foreach (array_keys($input) as $key) {
            $sets[] = "`$key` = :$key";
        }
        $sets_str = implode(", ", $sets);
        
        $sql = "UPDATE `$collection` SET $sets_str WHERE `id` = :__id";
        $stmt = $pdo->prepare($sql);
        
        // Bind values
        foreach ($input as $key => $val) {
            if (is_bool($val)) {
                $stmt->bindValue(":$key", $val ? 1 : 0, PDO::PARAM_INT);
            } else {
                $stmt->bindValue(":$key", $val);
            }
        }
        $stmt->bindValue(":__id", $id);
        
        $stmt->execute();
        
        echo json_encode(["success" => true]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "error" => "Error al actualizar registro: " . $e->getMessage()
        ]);
    }
    exit;
}

// 4. Action: delete (POST / DELETE)
if ($action === 'delete') {
    if (!$input || !isset($input['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Datos inválidos o falta el ID"]);
        exit;
    }

    try {
        $sql = "DELETE FROM `$collection` WHERE `id` = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $input['id']]);
        
        echo json_encode(["success" => true]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode([
            "success" => false, 
            "error" => "Error al eliminar registro: " . $e->getMessage()
        ]);
    }
    exit;
}

// Unknown action
http_response_code(404);
echo json_encode(["success" => false, "error" => "Acción no reconocida"]);
