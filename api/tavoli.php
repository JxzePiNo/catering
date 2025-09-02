<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class TavoliAPI {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        switch($method) {
            case 'GET':
                $this->getTavoli();
                break;
            case 'POST':
                $this->createTavolo();
                break;
            case 'PUT':
                $this->updateTavolo();
                break;
            case 'DELETE':
                $this->deleteTavolo();
                break;
            default:
                $this->sendError('Metodo non supportato', 405);
        }
    }

    private function getTavoli() {
        try {
            $query = "SELECT * FROM tavoli ORDER BY created_at ASC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $tavoli = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode JSON dimensions
            foreach ($tavoli as &$tavolo) {
                $tavolo['dimensioni'] = json_decode($tavolo['dimensioni'], true);
            }

            $this->sendResponse($tavoli);
        } catch (Exception $e) {
            $this->sendError('Errore nel recuperare i tavoli: ' . $e->getMessage());
        }
    }

    private function createTavolo() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validation
            $this->validateTavoloData($input);
            
            // Prepare dimensions JSON
            $dimensioni = [];
            if ($input['forma'] === 'rotondo') {
                $dimensioni['diametro'] = (int)$input['diametro'];
            } else {
                $dimensioni['lunghezza'] = (int)$input['lunghezza'];
                $dimensioni['larghezza'] = (int)$input['larghezza'];
            }
            
            // Validate dimensions
            $this->validateDimensions($input['posti_totali'], $input['forma'], $dimensioni);

            $query = "INSERT INTO tavoli (nome, posti_totali, forma, dimensioni, capotavola, posizione_x, posizione_y) 
                      VALUES (:nome, :posti_totali, :forma, :dimensioni, :capotavola, :posizione_x, :posizione_y)";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':nome', $input['nome']);
            $stmt->bindParam(':posti_totali', $input['posti_totali']);
            $stmt->bindParam(':forma', $input['forma']);
            $stmt->bindParam(':dimensioni', json_encode($dimensioni));
            $stmt->bindParam(':capotavola', $input['capotavola'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindParam(':posizione_x', $input['posizione_x'] ?? 100);
            $stmt->bindParam(':posizione_y', $input['posizione_y'] ?? 100);
            
            $stmt->execute();
            
            $tavoloId = $this->db->lastInsertId();
            
            // Get created table
            $getQuery = "SELECT * FROM tavoli WHERE id = :id";
            $getStmt = $this->db->prepare($getQuery);
            $getStmt->bindParam(':id', $tavoloId);
            $getStmt->execute();
            $tavolo = $getStmt->fetch(PDO::FETCH_ASSOC);
            $tavolo['dimensioni'] = json_decode($tavolo['dimensioni'], true);

            $this->sendResponse($tavolo, 'Tavolo creato con successo', 201);
            
        } catch (Exception $e) {
            $this->sendError('Errore nella creazione del tavolo: ' . $e->getMessage());
        }
    }

    private function updateTavolo() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                throw new Exception('ID tavolo richiesto');
            }

            $updates = [];
            $params = [':id' => $input['id']];

            // Build dynamic update query
            $allowedFields = ['nome', 'posti_totali', 'forma', 'capotavola', 'posizione_x', 'posizione_y'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = :$field";
                    $params[":$field"] = $input[$field];
                }
            }

            // Handle dimensions
            if (isset($input['dimensioni'])) {
                $updates[] = "dimensioni = :dimensioni";
                $params[':dimensioni'] = json_encode($input['dimensioni']);
            }

            if (empty($updates)) {
                throw new Exception('Nessun campo da aggiornare');
            }

            $query = "UPDATE tavoli SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->db->prepare($query);
            
            foreach ($params as $param => $value) {
                $stmt->bindValue($param, $value);
            }
            
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                throw new Exception('Tavolo non trovato o nessuna modifica effettuata');
            }

            $this->sendResponse(['message' => 'Tavolo aggiornato con successo']);
            
        } catch (Exception $e) {
            $this->sendError('Errore nell\'aggiornamento del tavolo: ' . $e->getMessage());
        }
    }

    private function deleteTavolo() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                throw new Exception('ID tavolo richiesto');
            }

            // Check if table has assigned guests
            $checkQuery = "SELECT COUNT(*) as guest_count FROM invitati WHERE tavolo_id = :id";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $input['id']);
            $checkStmt->execute();
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($result['guest_count'] > 0) {
                throw new Exception('Impossibile eliminare il tavolo: ci sono invitati assegnati');
            }

            $query = "DELETE FROM tavoli WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $input['id']);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                throw new Exception('Tavolo non trovato');
            }

            $this->sendResponse(['message' => 'Tavolo eliminato con successo']);
            
        } catch (Exception $e) {
            $this->sendError('Errore nell\'eliminazione del tavolo: ' . $e->getMessage());
        }
    }

    private function validateTavoloData($data) {
        if (empty($data['nome'])) {
            throw new Exception('Nome tavolo richiesto');
        }
        
        if (!isset($data['posti_totali']) || $data['posti_totali'] < 2 || $data['posti_totali'] > 20) {
            throw new Exception('Il numero di posti deve essere tra 2 e 20');
        }
        
        if (!in_array($data['forma'], ['rotondo', 'rettangolare'])) {
            throw new Exception('Forma non valida');
        }
        
        if ($data['forma'] === 'rotondo' && (!isset($data['diametro']) || $data['diametro'] < 80)) {
            throw new Exception('Diametro minimo 80cm per tavoli rotondi');
        }
        
        if ($data['forma'] === 'rettangolare') {
            if (!isset($data['lunghezza']) || $data['lunghezza'] < 100) {
                throw new Exception('Lunghezza minima 100cm per tavoli rettangolari');
            }
            if (!isset($data['larghezza']) || $data['larghezza'] < 60) {
                throw new Exception('Larghezza minima 60cm per tavoli rettangolari');
            }
        }
    }

    private function validateDimensions($persone, $forma, $dimensioni) {
        $spazioMinimo = $forma === 'rotondo' ? 60 : 50; // cm per persona
        
        if ($forma === 'rotondo') {
            $perimetro = pi() * $dimensioni['diametro'];
        } else {
            $perimetro = 2 * ($dimensioni['lunghezza'] + $dimensioni['larghezza']);
        }
        
        $spazioPerPersona = $perimetro / $persone;
        
        if ($spazioPerPersona < $spazioMinimo) {
            throw new Exception('Dimensioni insufficienti: le persone rischiano di stare troppo strette');
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
$api = new TavoliAPI();
$api->handleRequest();
?>