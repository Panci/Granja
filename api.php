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

// --- Cache de columnas permitidas por tabla ---
// Genera la whitelist de columnas desde el esquema de la BD.
// Excluye columnas de sistema (created_at, updated_at) para evitar
// que el cliente las envíe en INSERT/UPDATE.
$_COLUMN_CACHE = [];
function getAllowedColumns($pdo, $table) {
    global $_COLUMN_CACHE;
    if (isset($_COLUMN_CACHE[$table])) return $_COLUMN_CACHE[$table];
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table`");
    $stmt->execute();
    $internal = ['created_at', 'updated_at'];
    $cols = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if (!in_array($row['Field'], $internal, true)) {
            $cols[] = $row['Field'];
        }
    }
    $_COLUMN_CACHE[$table] = $cols;
    return $cols;
}

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
                $allowed = getAllowedColumns($pdo, $col);
                foreach ($input[$col] as $item) {
                    $keys = array_values(array_intersect(array_keys($item), $allowed));
                    if (empty($keys)) continue;
                    $cols = implode(", ", array_map(function($k) { return "`$k`"; }, $keys));
                    $placeholders = implode(", ", array_map(function($k) { return ":$k"; }, $keys));

                    $stmt = $pdo->prepare("INSERT INTO `$col` ($cols) VALUES ($placeholders)");

                    foreach ($keys as $k) {
                        $v = $item[$k] ?? null;
                        if (is_bool($v)) {
                            $stmt->bindValue(":$k", $v ? 1 : 0, PDO::PARAM_INT);
                        } elseif ($v === null) {
                            $stmt->bindValue(":$k", null, PDO::PARAM_NULL);
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
        // Whitelist de columnas permitidas (defensa frente a columnas internas)
        $allowed_columns = getAllowedColumns($pdo, $collection);
        $keys = array_values(array_intersect(array_keys($input), $allowed_columns));
        if (empty($keys)) {
            sendJson(["success" => false, "error" => "No hay columnas válidas para insertar"], 400);
        }
        $cols = implode(", ", array_map(function($k) { return "`$k`"; }, $keys));
        $placeholders = implode(", ", array_map(function($k) { return ":$k"; }, $keys));

        $sql = "INSERT INTO `$collection` ($cols) VALUES ($placeholders)";
        $stmt = $pdo->prepare($sql);

        // Bind values cleanly
        foreach ($keys as $key) {
            $val = $input[$key] ?? null;
            if (is_bool($val)) {
                $stmt->bindValue(":$key", $val ? 1 : 0, PDO::PARAM_INT);
            } elseif ($val === null) {
                $stmt->bindValue(":$key", null, PDO::PARAM_NULL);
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

        // Whitelist de columnas permitidas
        $allowed_columns = getAllowedColumns($pdo, $collection);
        $filtered = [];
        foreach ($input as $k => $v) {
            if (in_array($k, $allowed_columns, true)) {
                $filtered[$k] = $v;
            }
        }
        if (empty($filtered)) {
            sendJson(["success" => true, "message" => "Nada que actualizar"]);
        }

        $sets = [];
        foreach (array_keys($filtered) as $key) {
            $sets[] = "`$key` = :$key";
        }
        $sets_str = implode(", ", $sets);

        $sql = "UPDATE `$collection` SET $sets_str WHERE `id` = :__id";
        $stmt = $pdo->prepare($sql);

        foreach ($filtered as $key => $val) {
            if (is_bool($val)) {
                $stmt->bindValue(":$key", $val ? 1 : 0, PDO::PARAM_INT);
            } elseif ($val === null) {
                $stmt->bindValue(":$key", null, PDO::PARAM_NULL);
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
