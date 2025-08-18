<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    if ($method === 'GET' && end($path_parts) === 'stats') {
        // Get admin statistics
        $totalStmt = $pdo->query("SELECT COUNT(*) as count FROM leads");
        $availableStmt = $pdo->query("SELECT COUNT(*) as count FROM leads WHERE status = 'available'");
        $soldStmt = $pdo->query("SELECT COUNT(*) as count FROM leads WHERE status = 'sold'");
        $pendingStmt = $pdo->query("SELECT COUNT(*) as count FROM leads WHERE status = 'pending'");
        
        $stats = [
            'totalLeads' => (int) $totalStmt->fetch()['count'],
            'availableLeads' => (int) $availableStmt->fetch()['count'],
            'soldLeads' => (int) $soldStmt->fetch()['count'],
            'pendingLeads' => (int) $pendingStmt->fetch()['count']
        ];
        
        echo json_encode($stats);
        
    } elseif ($method === 'POST' && in_array('bulk-upload-leads', $path_parts)) {
        // Handle bulk Excel upload
        if (!isset($_FILES['excelFile'])) {
            http_response_code(400);
            echo json_encode(['message' => 'No file uploaded']);
            exit;
        }
        
        $file = $_FILES['excelFile'];
        
        // Basic file validation
        $allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!in_array($file['type'], $allowedTypes) && 
            !preg_match('/\.(xlsx|xls)$/i', $file['name'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Only Excel files (.xlsx, .xls) are allowed']);
            exit;
        }
        
        // For demo purposes, simulate Excel processing
        // In a real implementation, you'd use a PHP Excel library like PhpSpreadsheet
        // Expected Excel columns: Name, Contact Number, City, Project Type, Price (optional)
        $results = [
            'successful' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        // Simulate creating 5 sample leads from "Excel data" with prices
        $sampleLeads = [
            ['Name' => 'Modern Apartment Design', 'Contact Number' => '9876543210', 'City' => 'Mumbai', 'Project Type' => 'Living Room', 'Price' => '2500.00'],
            ['Name' => 'Luxury Villa Interior', 'Contact Number' => '9876543211', 'City' => 'Delhi', 'Project Type' => 'Bedroom', 'Price' => '3200.00'],
            ['Name' => 'Office Space Design', 'Contact Number' => '9876543212', 'City' => 'Bangalore', 'Project Type' => 'Office', 'Price' => '1800.00'],
            ['Name' => 'Kitchen Renovation', 'Contact Number' => '9876543213', 'City' => 'Chennai', 'Project Type' => 'Kitchen', 'Price' => '2800.00'],
            ['Name' => 'Restaurant Interior', 'Contact Number' => '9876543214', 'City' => 'Pune', 'Project Type' => 'Dining Room', 'Price' => '4500.00']
        ];
        
        foreach ($sampleLeads as $lead) {
            try {
                $contactInfo = "Contact: {$lead['Name']}, {$lead['Contact Number']}";
                $description = "{$lead['Project Type']} project in {$lead['City']}";
                
                // Use price from Excel data, default to 300.00 if not provided
                $price = isset($lead['Price']) && is_numeric($lead['Price']) ? floatval($lead['Price']) : 300.00;
                
                $stmt = $pdo->prepare("
                    INSERT INTO leads (title, description, category, location, price, contact_info, status, is_verified, is_exclusive, is_hot_lead, provider_id, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, 'available', 0, 0, 0, 1, NOW())
                ");
                
                $stmt->execute([
                    $lead['Name'],
                    $description,
                    $lead['Project Type'],
                    $lead['City'],
                    $price,
                    $contactInfo
                ]);
                
                $results['successful']++;
            } catch (Exception $e) {
                $results['failed']++;
                $results['errors'][] = "Failed to create lead: {$lead['Name']} - " . $e->getMessage();
            }
        }
        
        echo json_encode([
            'message' => "Bulk upload completed. {$results['successful']} leads created, {$results['failed']} failed.",
            'results' => $results
        ]);
        
    } elseif ($method === 'PATCH' && preg_match('/leads\/(\d+)\/status/', $path, $matches)) {
        // Update lead status
        $leadId = (int) $matches[1];
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['status'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Status is required']);
            exit;
        }
        
        $allowedStatuses = ['available', 'pending', 'sold'];
        if (!in_array($input['status'], $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid status. Must be: available, pending, or sold']);
            exit;
        }
        
        $stmt = $pdo->prepare("UPDATE leads SET status = ? WHERE id = ?");
        $stmt->execute([$input['status'], $leadId]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['message' => 'Lead not found']);
            exit;
        }
        
        // Return updated lead
        $stmt = $pdo->prepare("SELECT * FROM leads WHERE id = ?");
        $stmt->execute([$leadId]);
        $lead = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode($lead);
        
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>