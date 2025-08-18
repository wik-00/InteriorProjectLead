<?php
require_once '../config.php';
require_once '../paytm-checksum.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $orderId = $_GET['order_id'] ?? '';
    
    if (empty($orderId)) {
        throw new Exception('Order ID is required');
    }
    
    // Get order from database
    $stmt = $pdo->prepare("
        SELECT po.*, l.title as lead_title, l.category, l.location 
        FROM payment_orders po 
        LEFT JOIN leads l ON po.lead_id = l.id 
        WHERE po.order_id = ?
    ");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception('Order not found');
    }
    
    // Optionally verify with Paytm API for additional security
    $verifyParams = array(
        'MID' => $PAYTM_MERCHANT_ID,
        'ORDERID' => $orderId,
    );
    
    $checksum = PaytmChecksum::generateSignature($verifyParams, $PAYTM_MERCHANT_KEY);
    $verifyParams['CHECKSUMHASH'] = $checksum;
    
    // Make API call to Paytm for status verification
    $postData = json_encode($verifyParams);
    
    $ch = curl_init($PAYTM_STATUS_QUERY_URL);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $paytmResponse = json_decode($response, true);
    
    echo json_encode([
        'success' => true,
        'order' => [
            'order_id' => $order['order_id'],
            'lead_id' => $order['lead_id'],
            'lead_title' => $order['lead_title'],
            'amount' => $order['amount'],
            'status' => $order['status'],
            'txn_id' => $order['txn_id'],
            'created_at' => $order['created_at']
        ],
        'paytm_status' => $paytmResponse
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>