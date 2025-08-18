<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$path_info = $_SERVER['PATH_INFO'] ?? '';

switch ($method) {
    case 'GET':
        if (isset($uri_parts[2]) && is_numeric($uri_parts[2])) {
            // Get specific lead by ID
            getLeadById($pdo, $uri_parts[2]);
        } else {
            // Get all leads with optional filters
            getLeads($pdo);
        }
        break;
        
    case 'POST':
        createLead($pdo);
        break;
        
    case 'PUT':
        if (isset($uri_parts[2]) && is_numeric($uri_parts[2])) {
            updateLead($pdo, $uri_parts[2]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Lead ID required']);
        }
        break;
        
    case 'DELETE':
        if (isset($uri_parts[2]) && is_numeric($uri_parts[2])) {
            deleteLead($pdo, $uri_parts[2]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Lead ID required']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function getLeads($pdo) {
    try {
        $query = "SELECT l.*, u.first_name, u.last_name, u.profile_image, u.rating, u.review_count 
                  FROM leads l 
                  LEFT JOIN users u ON l.provider_id = u.id";
        
        $where_conditions = [];
        $params = [];
        
        // Add filters if provided
        if (isset($_GET['category']) && !empty($_GET['category'])) {
            $where_conditions[] = "l.category = ?";
            $params[] = $_GET['category'];
        }
        
        if (isset($_GET['location']) && !empty($_GET['location'])) {
            $where_conditions[] = "l.location LIKE ?";
            $params[] = '%' . $_GET['location'] . '%';
        }
        
        if (isset($_GET['minPrice']) && is_numeric($_GET['minPrice'])) {
            $where_conditions[] = "l.price >= ?";
            $params[] = $_GET['minPrice'];
        }
        
        if (isset($_GET['maxPrice']) && is_numeric($_GET['maxPrice'])) {
            $where_conditions[] = "l.price <= ?";
            $params[] = $_GET['maxPrice'];
        }
        
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $where_conditions[] = "l.status = ?";
            $params[] = $_GET['status'];
        }
        
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $where_conditions[] = "(l.title LIKE ? OR l.description LIKE ?)";
            $search_term = '%' . $_GET['search'] . '%';
            $params[] = $search_term;
            $params[] = $search_term;
        }
        
        if (!empty($where_conditions)) {
            $query .= " WHERE " . implode(' AND ', $where_conditions);
        }
        
        $query .= " ORDER BY l.created_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $leads = $stmt->fetchAll();
        
        // Format leads with provider information
        $formatted_leads = array_map(function($lead) {
            return [
                'id' => (int)$lead['id'],
                'title' => $lead['title'],
                'description' => $lead['description'],
                'category' => $lead['category'],
                'location' => $lead['location'],
                'price' => (float)$lead['price'],
                'budget' => $lead['budget'] ? (float)$lead['budget'] : null,
                'status' => $lead['status'],
                'isVerified' => (bool)$lead['is_verified'],
                'isExclusive' => (bool)$lead['is_exclusive'],
                'isHotLead' => (bool)$lead['is_hot_lead'],
                'contactInfo' => $lead['contact_info'],
                'imageUrl' => $lead['image_url'],
                'providerId' => (int)$lead['provider_id'],
                'createdAt' => $lead['created_at'],
                'provider' => $lead['first_name'] ? [
                    'id' => (int)$lead['provider_id'],
                    'firstName' => $lead['first_name'],
                    'lastName' => $lead['last_name'],
                    'profileImage' => $lead['profile_image'],
                    'rating' => (float)$lead['rating'],
                    'reviewCount' => (int)$lead['review_count']
                ] : null
            ];
        }, $leads);
        
        echo json_encode($formatted_leads);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch leads']);
    }
}

function getLeadById($pdo, $id) {
    try {
        $stmt = $pdo->prepare("
            SELECT l.*, u.first_name, u.last_name, u.profile_image, u.bio, u.rating, u.review_count 
            FROM leads l 
            LEFT JOIN users u ON l.provider_id = u.id 
            WHERE l.id = ?
        ");
        $stmt->execute([$id]);
        $lead = $stmt->fetch();
        
        if (!$lead) {
            http_response_code(404);
            echo json_encode(['error' => 'Lead not found']);
            return;
        }
        
        $formatted_lead = [
            'id' => (int)$lead['id'],
            'title' => $lead['title'],
            'description' => $lead['description'],
            'category' => $lead['category'],
            'location' => $lead['location'],
            'price' => (float)$lead['price'],
            'budget' => $lead['budget'] ? (float)$lead['budget'] : null,
            'status' => $lead['status'],
            'isVerified' => (bool)$lead['is_verified'],
            'isExclusive' => (bool)$lead['is_exclusive'],
            'isHotLead' => (bool)$lead['is_hot_lead'],
            'contactInfo' => $lead['contact_info'],
            'imageUrl' => $lead['image_url'],
            'providerId' => (int)$lead['provider_id'],
            'createdAt' => $lead['created_at'],
            'provider' => $lead['first_name'] ? [
                'id' => (int)$lead['provider_id'],
                'firstName' => $lead['first_name'],
                'lastName' => $lead['last_name'],
                'profileImage' => $lead['profile_image'],
                'bio' => $lead['bio'],
                'rating' => (float)$lead['rating'],
                'reviewCount' => (int)$lead['review_count']
            ] : null
        ];
        
        echo json_encode($formatted_lead);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch lead']);
    }
}

function createLead($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("
            INSERT INTO leads (title, description, category, location, price, budget, status, 
                             is_verified, is_exclusive, is_hot_lead, contact_info, image_url, provider_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['title'],
            $input['description'],
            $input['category'],
            $input['location'],
            $input['price'],
            $input['budget'] ?? null,
            $input['status'] ?? 'available',
            $input['isVerified'] ?? false,
            $input['isExclusive'] ?? false,
            $input['isHotLead'] ?? false,
            $input['contactInfo'],
            $input['imageUrl'] ?? null,
            $input['providerId'] ?? 1
        ]);
        
        $leadId = $pdo->lastInsertId();
        
        // Return the created lead
        getLeadById($pdo, $leadId);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create lead']);
    }
}

function updateLead($pdo, $id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("
            UPDATE leads SET 
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                location = COALESCE(?, location),
                price = COALESCE(?, price),
                budget = COALESCE(?, budget),
                status = COALESCE(?, status),
                is_verified = COALESCE(?, is_verified),
                is_exclusive = COALESCE(?, is_exclusive),
                is_hot_lead = COALESCE(?, is_hot_lead),
                contact_info = COALESCE(?, contact_info),
                image_url = COALESCE(?, image_url)
            WHERE id = ?
        ");
        
        $stmt->execute([
            $input['title'] ?? null,
            $input['description'] ?? null,
            $input['category'] ?? null,
            $input['location'] ?? null,
            $input['price'] ?? null,
            $input['budget'] ?? null,
            $input['status'] ?? null,
            $input['isVerified'] ?? null,
            $input['isExclusive'] ?? null,
            $input['isHotLead'] ?? null,
            $input['contactInfo'] ?? null,
            $input['imageUrl'] ?? null,
            $id
        ]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Lead not found']);
            return;
        }
        
        // Return the updated lead
        getLeadById($pdo, $id);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update lead']);
    }
}

function deleteLead($pdo, $id) {
    try {
        $stmt = $pdo->prepare("DELETE FROM leads WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Lead not found']);
            return;
        }
        
        echo json_encode(['message' => 'Lead deleted successfully']);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete lead']);
    }
}
?>