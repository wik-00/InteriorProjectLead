<?php
require_once '../config.php';
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$uri_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));

switch ($method) {
    case 'POST':
        if (isset($uri_parts[2]) && $uri_parts[2] === 'login') {
            login($pdo);
        } elseif (isset($uri_parts[2]) && $uri_parts[2] === 'register') {
            register($pdo);
        } elseif (isset($uri_parts[2]) && $uri_parts[2] === 'logout') {
            logout();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    case 'GET':
        if (isset($uri_parts[2]) && $uri_parts[2] === 'user') {
            getCurrentUser();
        } elseif (isset($uri_parts[2]) && $uri_parts[2] === 'verify-session') {
            verifySession();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

function login($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['username']) || empty($input['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password are required']);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$input['username']]);
        $user = $stmt->fetch();
        
        if (!$user || $user['password'] !== $input['password']) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
            return;
        }
        
        // Store user session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        // Return user data without password
        unset($user['password']);
        $user['id'] = (int)$user['id'];
        $user['rating'] = (float)$user['rating'];
        $user['reviewCount'] = (int)$user['review_count'];
        $user['isProvider'] = (bool)$user['is_provider'];
        $user['isAdmin'] = (bool)$user['is_admin'];
        $user['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
        
        echo json_encode($user);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    }
}

function register($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['username']) || empty($input['email']) || empty($input['password']) || 
            empty($input['firstName']) || empty($input['lastName']) || empty($input['phoneNumber'])) {
            http_response_code(400);
            echo json_encode(['error' => 'All fields are required: username, email, password, firstName, lastName, phoneNumber']);
            return;
        }
        
        // Check if user already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$input['username'], $input['email']]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Username or email already exists']);
            return;
        }
        
        // Parse name if provided as single field
        $firstName = $input['firstName'] ?? '';
        $lastName = $input['lastName'] ?? '';
        if (!empty($input['name']) && empty($firstName) && empty($lastName)) {
            $nameParts = explode(' ', trim($input['name']), 2);
            $firstName = $nameParts[0] ?? '';
            $lastName = $nameParts[1] ?? '';
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO users (username, email, password, first_name, last_name, phone_number, bio, profile_image, is_provider, is_admin) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $input['username'],
            $input['email'],
            $input['password'],
            $firstName ?: $input['firstName'],
            $lastName ?: $input['lastName'],
            $input['phoneNumber'],
            $input['bio'] ?? null,
            $input['profileImage'] ?? null,
            $input['isProvider'] ?? false,
            $input['isAdmin'] ?? false
        ]);
        
        $userId = $pdo->lastInsertId();
        
        // Get the created user
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        // Store user session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        // Return user data without password
        unset($user['password']);
        $user['id'] = (int)$user['id'];
        $user['rating'] = (float)$user['rating'];
        $user['reviewCount'] = (int)$user['review_count'];
        $user['isProvider'] = (bool)$user['is_provider'];
        $user['isAdmin'] = (bool)$user['is_admin'];
        
        echo json_encode($user);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    }
}

function logout() {
    session_destroy();
    echo json_encode(['message' => 'Logged out successfully']);
}

function getCurrentUser() {
    if (isset($_SESSION['user_id'])) {
        // Return basic user info from session
        echo json_encode([
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username']
        ]);
    } else {
        echo json_encode(null);
    }
}

function verifySession() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(['message' => 'Session valid']);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'No session']);
    }
}
?>