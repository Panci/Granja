<?php
// ============================================================
// setup_db.php — Instalador de la Base de Datos
// Ejecuta este archivo una sola vez desde tu navegador en Hostinger
// ============================================================

require_once __DIR__ . '/config.php';

echo "<h1>Instalación de la Base de Datos ERP Animal</h1>";

$sql_file = __DIR__ . '/database.sql';

if (!file_exists($sql_file)) {
    die("Error: No se encuentra el archivo database.sql en el servidor.");
}

$sql_content = file_get_contents($sql_file);

if (empty($sql_content)) {
    die("Error: El archivo database.sql está vacío.");
}

try {
    // Ejecutar múltiples consultas
    $pdo->exec($sql_content);
    echo "<p style='color: green; font-weight: bold;'>✅ ¡La base de datos se ha importado y creado correctamente!</p>";
    echo "<p>Tablas creadas y datos de prueba insertados.</p>";
    echo "<p><b>Por seguridad, debes eliminar este archivo (setup_db.php) y database.sql de Hostinger después de comprobar que todo funciona.</b></p>";
    echo "<p><a href='./'>Ir a la aplicación</a></p>";
} catch (\PDOException $e) {
    echo "<p style='color: red; font-weight: bold;'>❌ Error al importar la base de datos:</p>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
