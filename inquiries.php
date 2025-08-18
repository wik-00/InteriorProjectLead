<?php
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));

switch ($method) {
    case 'POST':
        if (isset($uri_parts[2]) && is_numeric($uri_parts[2])) {
            createMessage($pdo, $uri_parts[2]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Lead ID required']);
        }
        break;
        
    case 'GET':
        if (isset($uri_parts[2]) && is_numeric($uri_parts[2])) {
            if (isset($uri_parts[4]) && $uri_parts[3] === 'conversation' && 
                isset($uri_parts[5]) && is_numeric($uri_parts[4]) && is_numeric($uri_parts[5])) {
                getConversation($pdo, $uri_parts[2], $uri_parts[4], $uri_parts[5]);
            } else {
                getMessagesForLead($pdo, $uri_parts[2]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Lead ID required']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function createMessage($pdo, $leadId) {
    try {
        // Verify lead exists
        $stmt = $pdo->prepare("SELECT id FROM leads WHERE id = ?");
        $stmt->execute([$leadId]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Lead not found']);
            return;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("
            INSERT INTO messages (lead_id, sender_id, receiver_id, content) 
            VALUES (?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $leadId,
            $input['senderId'],
            $input['receiverId'],
            $input['content']
        ]);
        
        $messageId = $pdo->lastInsertId();
        
        // Return the created message
        $stmt = $pdo->prepare("
            SELECT m.*, 
                   s.first_name as sender_first_name, s.last_name as sender_last_name, s.profile_image as sender_image,
                   r.first_name as receiver_first_name, r.last_name as receiver_last_name, r.profile_image as receiver_image
            FROM messages m 
            LEFT JOIN users s ON m.sender_id = s.id 
            LEFT JOIN users r ON m.receiver_id = r.id 
            WHERE m.id = ?
        ");
        $stmt->execute([$messageId]);
        $message = $stmt->fetch();
        
        $formatted_message = [
            'id' => (int)$message['id'],
            'leadId' => (int)$message['lead_id'],
            'senderId' => (int)$message['sender_id'],
            'receiverId' => (int)$message['receiver_id'],
            'content' => $message['content'],
            'createdAt' => $message['created_at'],
            'sender' => $message['sender_first_name'] ? [
                'id' => (int)$message['sender_id'],
                'firstName' => $message['sender_first_name'],
                'lastName' => $message['sender_last_name'],
                'profileImage' => $message['sender_image']
            ] : null,
            'receiver' => $message['receiver_first_name'] ? [
                'id' => (int)$message['receiver_id'],
                'firstName' => $message['receiver_first_name'],
                'lastName' => $message['receiver_last_name'],
                'profileImage' => $message['receiver_image']
            ] : null
        ];
        
        http_response_code(201);
        echo json_encode($formatted_message);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create message']);
    }
}

function getMessagesForLead($pdo, $leadId) {
    try {
        $stmt = $pdo->prepare("
            SELECT m.*, 
                   s.first_name as sender_first_name, s.last_name as sender_last_name, s.profile_image as sender_image,
                   r.first_name as receiver_first_name, r.last_name as receiver_last_name, r.profile_image as receiver_image
            FROM messages m 
            LEFT JOIN users s ON m.sender_id = s.id 
            LEFT JOIN users r ON m.receiver_id = r.id 
            WHERE m.lead_id = ? 
            ORDER BY m.created_at ASC
        ");
        $stmt->execute([$leadId]);
        $messages = $stmt->fetchAll();
        
        $formatted_messages = array_map(function($message) {
            return [
                'id' => (int)$message['id'],
                'leadId' => (int)$message['lead_id'],
                'senderId' => (int)$message['sender_id'],
                'receiverId' => (int)$message['receiver_id'],
                'content' => $message['content'],
                'createdAt' => $message['created_at'],
                'sender' => $message['sender_first_name'] ? [
                    'id' => (int)$message['sender_id'],
                    'firstName' => $message['sender_first_name'],
                    'lastName' => $message['sender_last_name'],
                    'profileImage' => $message['sender_image']
                ] : null,
                'receiver' => $message['receiver_first_name'] ? [
                    'id' => (int)$message['receiver_id'],
                    'firstName' => $message['receiver_first_name'],
                    'lastName' => $message['receiver_last_name'],
                    'profileImage' => $message['receiver_image']
                ] : null
            ];
        }, $messages);
        
        echo json_encode($formatted_messages);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch messages']);
    }
}

function getConversation($pdo, $leadId, $userId1, $userId2) {
    try {
        $stmt = $pdo->prepare("
            SELECT m.*, 
                   s.first_name as sender_first_name, s.last_name as sender_last_name, s.profile_image as sender_image
            FROM messages m 
            LEFT JOIN users s ON m.sender_id = s.id 
            WHERE m.lead_id = ? AND 
                  ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
            ORDER BY m.created_at ASC
        ");
        $stmt->execute([$leadId, $userId1, $userId2, $userId2, $userId1]);
        $messages = $stmt->fetchAll();
        
        $formatted_messages = array_map(function($message) {
            return [
                'id' => (int)$message['id'],
                'leadId' => (int)$message['lead_id'],
                'senderId' => (int)$message['sender_id'],
                'receiverId' => (int)$message['receiver_id'],
                'content' => $message['content'],
                'createdAt' => $message['created_at'],
                'sender' => $message['sender_first_name'] ? [
                    'id' => (int)$message['sender_id'],
                    'firstName' => $message['sender_first_name'],
                    'lastName' => $message['sender_last_name'],
                    'profileImage' => $message['sender_image']
                ] : null
            ];
        }, $messages);
        
        echo json_encode($formatted_messages);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch conversation']);
    }
}
?>