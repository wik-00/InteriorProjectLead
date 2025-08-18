<?php
require_once '../config.php';
require_once '../paytm-checksum.php';

// This file handles the callback from Paytm after payment

try {
    $paytmParams = $_POST;
    
    // Verify checksum
    $isValidChecksum = PaytmChecksum::verifySignature($paytmParams, $PAYTM_MERCHANT_KEY, $paytmParams['CHECKSUMHASH']);
    
    if (!$isValidChecksum) {
        throw new Exception('Checksum verification failed');
    }
    
    $orderId = $paytmParams['ORDERID'];
    $txnId = $paytmParams['TXNID'];
    $amount = $paytmParams['TXNAMOUNT'];
    $status = $paytmParams['STATUS'];
    $respCode = $paytmParams['RESPCODE'];
    $respMsg = $paytmParams['RESPMSG'];
    
    // Get order details from database
    $stmt = $pdo->prepare("SELECT * FROM payment_orders WHERE order_id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception('Order not found');
    }
    
    // Update payment status
    $stmt = $pdo->prepare("
        UPDATE payment_orders 
        SET status = ?, txn_id = ?, paytm_response = ?, updated_at = NOW() 
        WHERE order_id = ?
    ");
    
    $paymentStatus = ($status === 'TXN_SUCCESS') ? 'success' : 'failed';
    $stmt->execute([
        $paymentStatus,
        $txnId,
        json_encode($paytmParams),
        $orderId
    ]);
    
    // If payment successful, update lead status
    if ($status === 'TXN_SUCCESS') {
        $stmt = $pdo->prepare("UPDATE leads SET status = 'sold' WHERE id = ?");
        $stmt->execute([$order['lead_id']]);
        
        // Create inquiry record
        $stmt = $pdo->prepare("
            INSERT INTO inquiries (lead_id, buyer_id, message, status, created_at) 
            VALUES (?, ?, ?, 'purchased', NOW())
        ");
        $stmt->execute([
            $order['lead_id'],
            $order['user_id'],
            'Lead purchased successfully via Paytm payment. Transaction ID: ' . $txnId
        ]);
    }
    
    // Redirect to success/failure page
    $redirectUrl = "../../index.html";
    
    if ($status === 'TXN_SUCCESS') {
        $redirectUrl .= "?payment=success&order_id=" . urlencode($orderId) . "&txn_id=" . urlencode($txnId);
    } else {
        $redirectUrl .= "?payment=failed&order_id=" . urlencode($orderId) . "&reason=" . urlencode($respMsg);
    }
    
    // JavaScript redirect with payment result
    echo "
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Processing...</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .loading { font-size: 18px; color: #666; }
        </style>
    </head>
    <body>
        <div class='loading'>Processing payment result...</div>
        <script>
            setTimeout(function() {
                window.location.href = '$redirectUrl';
            }, 2000);
        </script>
    </body>
    </html>
    ";
    
} catch (Exception $e) {
    // Redirect to error page
    $errorUrl = "../../index.html?payment=error&message=" . urlencode($e->getMessage());
    header("Location: $errorUrl");
    exit;
}
?>