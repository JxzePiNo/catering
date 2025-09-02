<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class StatesAPI {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        switch($method) {
            case 'GET':
                $this->getStates();
                break;
            case 'POST':
                $this->saveState();
                break;
            case 'DELETE':
                $this->cleanOldStates();
                break;
            default:
                $this->sendError('Metodo non supportato', 405);
        }
    }

    private function getStates() {
        try {
            $sessionId = $_GET['session_id'] ?? '';
            
            if (empty($sessionId)) {
                throw new Exception('Session ID richiesto');
            }

            $query = "SELECT * FROM app_states WHERE session_id = :session_id ORDER BY created_at DESC LIMIT 50";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':session_id', $sessionId);
            $stmt->execute();
            
            $states = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Decode JSON state_data
            foreach ($states as &$state) {
                $state['state_data'] = json_decode($state['state_data'], true);
            }

            $this->sendResponse($states);
            
        } catch (Exception $e) {
            $this->sendError('Errore nel recuperare gli stati: ' . $e->getMessage());
        }
    }

    private function saveState() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['session_id']) || !isset($input['description']) || !isset($input['state_data'])) {
                throw new Exception('Dati stato incompleti');
            }

            $query = "INSERT INTO app_states (session_id, description, state_data) VALUES (:session_id, :description, :state_data)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':session_id', $input['session_id']);
            $stmt->bindParam(':description', $input['description']);
            $stmt->bindParam(':state_data', json_encode($input['state_data']));
            
            $stmt->execute();
            
            // Mantieni solo gli ultimi 100 stati per sessione
            $cleanupQuery = "DELETE FROM app_states WHERE session_id = :session_id AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM app_states WHERE session_id = :session_id ORDER BY created_at DESC LIMIT 100
                ) as keep_states
            )";
            
            $cleanupStmt = $this->db->prepare($cleanupQuery);
            $cleanupStmt->bindParam(':session_id', $input['session_id']);
            $cleanupStmt->execute();

            $this->sendResponse(['id' => $this->db->lastInsertId()], 'Stato salvato');
            
        } catch (Exception $e) {
            $this->sendError('Errore nel salvare lo stato: ' . $e->getMessage());
        }
    }

    private function cleanOldStates() {
        try {
            // Rimuovi stati più vecchi di 7 giorni
            $query = "DELETE FROM app_states WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $deletedCount = $stmt->rowCount();
            $this->sendResponse(['deleted_count' => $deletedCount], 'Stati vecchi rimossi');
            
        } catch (Exception $e) {
            $this->sendError('Errore nella pulizia degli stati: ' . $e->getMessage());
        }
    }

    private function sendResponse($data, $message = 'Success', $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ]);
    }

    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
    }
}

// Execute API
$api = new StatesAPI();
$api->handleRequest();
?>