<?php
class Database {
    private $host = '';
    private $db_name = '';
    private $username = '';
    private $password = '';
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, 
                                  $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}

// Configurazioni globali
define('APP_NAME', 'Gestione Tavoli Matrimonio');
define('APP_VERSION', '1.0.0');

// Impostazioni sessione
session_start();

// Timezone
date_default_timezone_set('Europe/Rome');
?>
