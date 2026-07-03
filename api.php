<?php
// ============================================================
// api.php — API REST para ERP Animal
// ============================================================

// --- Configuración de producción: nunca enviar errores HTML ---
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);        // Los errores van al log del servidor, no al navegador

ob_start(); // Capturar cualquier salida accidental (BOM, whitespace, warnings)

// --- Función centralizada de respuesta JSON ---
// Garantiza que TODA respuesta de esta API sea JSON válido,
// descartando cualquier basura que PHP haya emitido antes.
function sendJson($data, $httpCode = 200) {
    // Descartar cualquier salida previa (warnings, espacios, BOM...)
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($httpCode);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($data);
    exit;
}

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
        sendJson(["success" => true, "data" => $data]);
    } catch (\Exception $e) {
        sendJson(["success" => false, "error" => "Error al obtener datos: " . $e->getMessage()], 500);
    }
}

// 5. Action: import (POST)
// Reemplaza todos los datos de la BD con el JSON de un backup importado
if ($action === 'import') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        sendJson(["success" => false, "error" => "Datos de importación vacíos"], 400);
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
        sendJson(["success" => true]);
    } catch (\Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        sendJson(["success" => false, "error" => "Error al importar datos en la BD: " . $e->getMessage()], 500);
    }
}

// For all other actions, we need a valid collection
if (!in_array($collection, $valid_collections)) {
    sendJson(["success" => false, "error" => "Colección no válida"], 400);
}

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);

// 2. Action: create (POST)
if ($action === 'create') {
    if (!$input) {
        sendJson(["success" => false, "error" => "Datos de entrada vacíos"], 400);
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
        
        sendJson(["success" => true]);
    } catch (\Exception $e) {
        sendJson(["success" => false, "error" => "Error al insertar registro: " . $e->getMessage()], 500);
    }
}

// 3. Action: update (POST / PUT)
if ($action === 'update') {
    if (!$input || !isset($input['id'])) {
        sendJson(["success" => false, "error" => "Datos inválidos o falta el ID"], 400);
    }

    try {
        $id = $input['id'];
        unset($input['id']); // Don't update the ID column
        
        if (empty($input)) {
            sendJson(["success" => true, "message" => "Nada que actualizar"]);
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
        
        sendJson(["success" => true]);
    } catch (\Exception $e) {
        sendJson(["success" => false, "error" => "Error al actualizar registro: " . $e->getMessage()], 500);
    }
}

// 4. Action: delete (POST / DELETE)
if ($action === 'delete') {
    if (!$input || !isset($input['id'])) {
        sendJson(["success" => false, "error" => "Datos inválidos o falta el ID"], 400);
    }

    try {
        $sql = "DELETE FROM `$collection` WHERE `id` = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $input['id']]);
        
        sendJson(["success" => true]);
    } catch (\Exception $e) {
        sendJson(["success" => false, "error" => "Error al eliminar registro: " . $e->getMessage()], 500);
    }
}

// Unknown action
sendJson(["success" => false, "error" => "Acción no reconocida"], 404);
