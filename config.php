<?php
// Database configuration for Hostinger MariaDB
// Update these values with your Hostinger database credentials
$DB_HOST = 'localhost'; // Usually localhost on shared hosting
$DB_NAME = 'u370057811_LeadsDatabase'; // Your database name from Hostinger
$DB_USER = 'u370057811_umairsaif7'; // Your database username
$DB_PASS = 'Umairsaif@7'; // Your database password

// Create database connection
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Paytm Payment Gateway Configuration
$PAYTM_MERCHANT_ID = 'your_merchant_id_here';
$PAYTM_MERCHANT_KEY = 'your_merchant_key_here';
$PAYTM_WEBSITE = 'WEBSTAGING'; // Change to your website name for production
$PAYTM_INDUSTRY_TYPE = 'Retail';
$PAYTM_CHANNEL_ID = 'WEB';
$PAYTM_ENVIRONMENT = 'staging'; // Change to 'production' for live

// Paytm URLs
if ($PAYTM_ENVIRONMENT === 'production') {
    $PAYTM_TXN_URL = 'https://securegw.paytm.in/order/process';
    $PAYTM_STATUS_QUERY_URL = 'https://securegw.paytm.in/order/status';
} else {
    $PAYTM_TXN_URL = 'https://securegw-stage.paytm.in/order/process';
    $PAYTM_STATUS_QUERY_URL = 'https://securegw-stage.paytm.in/order/status';
}

// Set JSON content type for API responses
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
?>