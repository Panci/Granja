<?php
// ============================================================
// config.example.php — Plantilla de configuración
// ERP Animal — Sistema de Gestión Veterinaria
// ============================================================
// 1. Copia este archivo como config.php
// 2. Reemplaza los valores con los de tu base de datos Hostinger
// 3. NO subas config.php al repositorio (debe estar en .gitignore)
// 4. Para mayor seguridad, usa variables de entorno en el panel
//    de Hostinger en lugar de escribir las credenciales aquí.
// ============================================================

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'u123456_erp_animal';     // <- Tu nombre de BD
$db_user = getenv('DB_USER') ?: 'u123456_admin';            // <- Tu usuario
$db_pass = getenv('DB_PASS') ?: 'tu_password_segura';       // <- Tu password
$db_charset = 'utf8mb4';

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=$db_charset",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (\PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    sendJson(["success" => false, "error" => "Error de conexión con la base de datos"], 500);
}
