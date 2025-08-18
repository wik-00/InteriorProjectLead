<?php
require_once '../config.php';
require_once '../paytm-checksum.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $requiredFields = ['lead_id', 'user_id', 'amount', 'customer_phone', 'customer_email'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $leadId = $input['lead_id'];
    $userId = $input['user_id'];
    $amount = floatval($input['amount']);
    $customerPhone = $input['customer_phone'];
    $customerEmail = $input['customer_email'];
    
    // Generate unique order ID
    $orderId = 'IPL_' . time() . '_' . $leadId . '_' . $userId;
    
    // Get your website domain for callback URLs
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $domain = $protocol . '://' . $_SERVER['HTTP_HOST'];
    
    // Paytm payment parameters
    $paytmParams = array(
        'MID' => $PAYTM_MERCHANT_ID,
        'WEBSITE' => $PAYTM_WEBSITE,
        'CHANNEL_ID' => $PAYTM_CHANNEL_ID,
        'INDUSTRY_TYPE_ID' => $PAYTM_INDUSTRY_TYPE,
        'ORDER_ID' => $orderId,
        'CUST_ID' => 'CUST_' . $userId,
        'TXN_AMOUNT' => $amount,
        'CALLBACK_URL' => $domain . '/php-backend/api/paytm-callback.php',
        'EMAIL' => $customerEmail,
        'MOBILE_NO' => $customerPhone,
    );
    
    // Generate checksum
    $checksum = PaytmChecksum::generateSignature($paytmParams, $PAYTM_MERCHANT_KEY);
    $paytmParams['CHECKSUMHASH'] = $checksum;
    
    // Store order details in database for verification later
    $stmt = $pdo->prepare("
        INSERT INTO payment_orders (order_id, lead_id, user_id, amount, status, paytm_params, created_at) 
        VALUES (?, ?, ?, ?, 'pending', ?, NOW())
    ");
    
    $stmt->execute([
        $orderId,
        $leadId,
        $userId,
        $amount,
        json_encode($paytmParams)
    ]);
    
    // Return payment parameters for frontend
    echo json_encode([
        'success' => true,
        'order_id' => $orderId,
        'paytm_url' => $PAYTM_TXN_URL,
        'paytm_params' => $paytmParams,
        'message' => 'Payment request generated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>