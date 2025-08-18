<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    getCategories($pdo);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

function getCategories($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT DISTINCT category FROM leads ORDER BY category ASC");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        echo json_encode($categories);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch categories']);
    }
}
?>