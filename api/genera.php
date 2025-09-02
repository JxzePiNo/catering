<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

class GeneratoreTavoli {
    private $db;
    private $tavoli = [];
    private $invitati = [];
    private $collegamenti = [];
    private $assegnazioni = [];

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function genera() {
        try {
            // 1. Carica dati
            $this->caricaDati();
            
            // 2. Validazioni
            $this->validaDati();
            
            // 3. Crea gruppi affini
            $gruppi = $this->creaGruppiAffini();
            
            // 4. Assegna gruppi ai tavoli
            $this->assegnaGruppiATavoli($gruppi);
            
            // 5. Ottimizza disposizione
            $this->ottimizzaDisposizione();
            
            // 6. Salva risultati
            $this->salvaRisultati();
            
            return [
                'success' => true,
                'message' => 'Disposizione generata con successo',
                'data' => $this->getAssignmentSummary()
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    private function caricaDati() {
        // Carica tavoli
        $stmt = $this->db->prepare("SELECT * FROM tavoli ORDER BY posti_totali DESC");
        $stmt->execute();
        $this->tavoli = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Carica invitati
        $stmt = $this->db->prepare("SELECT * FROM invitati ORDER BY id");
        $stmt->execute();
        $this->invitati = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Carica collegamenti
        $stmt = $this->db->prepare("SELECT * FROM collegamenti_invitati");
        $stmt->execute();
        $this->collegamenti = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function validaDati() {
        if (empty($this->tavoli)) {
            throw new Exception('Nessun tavolo disponibile');
        }

        if (empty($this->invitati)) {
            throw new Exception('Nessun invitato da assegnare');
        }

        $postiTotali = array_sum(array_column($this->tavoli, 'posti_totali'));
        $invitatiTotali = count($this->invitati);

        if ($invitatiTotali > $postiTotali) {
            throw new Exception("Posti insufficienti: {$invitatiTotali} invitati per {$postiTotali} posti");
        }

        if ($invitatiTotali < $postiTotali * 0.7) {
            // Warning ma non errore se i tavoli sono troppo vuoti
            error_log("Warning: Molti posti vuoti - {$invitatiTotali} invitati per {$postiTotali} posti");
        }
    }

    private function creaGruppiAffini() {
        // Implementazione Union-Find per creare cluster di invitati connessi
        $parent = [];
        $rank = [];
        
        // Inizializza ogni invitato come gruppo separato
        foreach ($this->invitati as $invitato) {
            $parent[$invitato['id']] = $invitato['id'];
            $rank[$invitato['id']] = 0;
        }

        // Funzione find con path compression
        function find(&$parent, $x) {
            if ($parent[$x] !== $x) {
                $parent[$x] = find($parent, $parent[$x]);
            }
            return $parent[$x];
        }

        // Funzione union by rank
        function union(&$parent, &$rank, $x, $y) {
            $rootX = find($parent, $x);
            $rootY = find($parent, $y);
            
            if ($rootX !== $rootY) {
                if ($rank[$rootX] < $rank[$rootY]) {
                    $parent[$rootX] = $rootY;
                } elseif ($rank[$rootX] > $rank[$rootY]) {
                    $parent[$rootY] = $rootX;
                } else {
                    $parent[$rootY] = $rootX;
                    $rank[$rootX]++;
                }
            }
        }

        // Unisci invitati con collegamenti verdi
        foreach ($this->collegamenti as $collegamento) {
            if ($collegamento['tipo'] === 'green') {
                union($parent, $rank, $collegamento['invitato_a'], $collegamento['invitato_b']);
            }
        }

        // Crea gruppi basati sui parent
        $gruppi = [];
        foreach ($this->invitati as $invitato) {
            $root = find($parent, $invitato['id']);
            if (!isset($gruppi[$root])) {
                $gruppi[$root] = [];
            }
            $gruppi[$root][] = $invitato;
        }

        return array_values($gruppi);
    }

    private function assegnaGruppiATavoli($gruppi) {
        // Ordina gruppi per dimensione decrescente
        usort($gruppi, function($a, $b) {
            return count($b) - count($a);
        });

        // Ordina tavoli per posti decrescenti
        $tavoliDisponibili = $this->tavoli;
        usort($tavoliDisponibili, function($a, $b) {
            return $b['posti_totali'] - $a['posti_totali'];
        });

        // Assegna gruppi ai tavoli
        foreach ($gruppi as $gruppo) {
            $dimensioneGruppo = count($gruppo);
            $tavoloAssegnato = null;

            // Trova il tavolo più piccolo che può contenere il gruppo
            foreach ($tavoliDisponibili as $index => $tavolo) {
                $postiLiberi = $this->calcolaPostiLiberi($tavolo['id']);
                
                if ($postiLiberi >= $dimensioneGruppo) {
                    $tavoloAssegnato = $tavolo;
                    break;
                }
            }

            if (!$tavoloAssegnato) {
                // Dividi il gruppo se non trova tavoli
                $this->dividiGruppo($gruppo, $tavoliDisponibili);
            } else {
                // Assegna tutto il gruppo al tavolo
                $this->assegnaGruppoATavolo($gruppo, $tavoloAssegnato);
            }
        }
    }

    private function assegnaGruppoATavolo($gruppo, $tavolo) {
        $posizionePartenza = $this->getProximaPosizioneLibera($tavolo['id']);
        
        foreach ($gruppo as $index => $invitato) {
            $posizione = $posizionePartenza + $index;
            $this->assegnazioni[] = [
                'invitato_id' => $invitato['id'],
                'tavolo_id' => $tavolo['id'],
                'posizione' => $posizione % $tavolo['posti_totali'] + 1
            ];
        }
    }

    private function dividiGruppo($gruppo, &$tavoliDisponibili) {
        // Strategia: mantieni insieme le coppie più forti
        $sottogruppi = $this->dividiGruppoIntelligente($gruppo);
        
        foreach ($sottogruppi as $sottogruppo) {
            foreach ($tavoliDisponibili as $tavolo) {
                $postiLiberi = $this->calcolaPostiLiberi($tavolo['id']);
                
                if ($postiLiberi >= count($sottogruppo)) {
                    $this->assegnaGruppoATavolo($sottogruppo, $tavolo);
                    break;
                }
            }
        }
    }

    private function dividiGruppoIntelligente($gruppo) {
        // Implementazione semplificata: divide in gruppi di massimo 4 persone
        $sottogruppi = [];
        $gruppoCorrente = [];
        
        foreach ($gruppo as $invitato) {
            $gruppoCorrente[] = $invitato;
            
            if (count($gruppoCorrente) >= 4) {
                $sottogruppi[] = $gruppoCorrente;
                $gruppoCorrente = [];
            }
        }
        
        if (!empty($gruppoCorrente)) {
            $sottogruppi[] = $gruppoCorrente;
        }
        
        return $sottogruppi;
    }

    private function ottimizzaDisposizione() {
        // Risolvi conflitti rossi
        $this->risolviConflittiRossi();
        
        // Massimizza soddisfazione collegamenti gialli/verdi
        $this->ottimizzaCollegamentiPositivi();
    }

    private function risolviConflittiRossi() {
        foreach ($this->collegamenti as $collegamento) {
            if ($collegamento['tipo'] === 'red') {
                $invitato_a = $collegamento['invitato_a'];
                $invitato_b = $collegamento['invitato_b'];
                
                $assegnazione_a = $this->trovaAssegnazione($invitato_a);
                $assegnazione_b = $this->trovaAssegnazione($invitato_b);
                
                if ($assegnazione_a && $assegnazione_b && 
                    $assegnazione_a['tavolo_id'] === $assegnazione_b['tavolo_id']) {
                    
                    // Sposta uno dei due se possibile
                    $this->spostaInvitato($invitato_b);
                }
            }
        }
    }

    private function ottimizzaCollegamentiPositivi() {
        // Implementazione semplificata
        // TODO: Implementare algoritmo di ottimizzazione più sofisticato
    }

    private function spostaInvitato($invitatoId) {
        $assegnazioneAttuale = $this->trovaAssegnazione($invitatoId);
        if (!$assegnazioneAttuale) return;

        // Trova tavolo alternativo
        foreach ($this->tavoli as $tavolo) {
            if ($tavolo['id'] !== $assegnazioneAttuale['tavolo_id']) {
                $postiLiberi = $this->calcolaPostiLiberi($tavolo['id']);
                
                if ($postiLiberi > 0) {
                    // Aggiorna assegnazione
                    foreach ($this->assegnazioni as &$assegnazione) {
                        if ($assegnazione['invitato_id'] == $invitatoId) {
                            $assegnazione['tavolo_id'] = $tavolo['id'];
                            $assegnazione['posizione'] = $this->getProximaPosizioneLibera($tavolo['id']);
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }

    private function calcolaPostiLiberi($tavoloId) {
        $tavoloInfo = array_filter($this->tavoli, fn($t) => $t['id'] == $tavoloId)[0];
        $postiTotali = $tavoloInfo['posti_totali'];
        
        $postiOccupati = count(array_filter($this->assegnazioni, fn($a) => $a['tavolo_id'] == $tavoloId));
        
        return $postiTotali - $postiOccupati;
    }

    private function getProximaPosizioneLibera($tavoloId) {
        $posizioniOccupate = array_map(
            fn($a) => $a['posizione'],
            array_filter($this->assegnazioni, fn($a) => $a['tavolo_id'] == $tavoloId)
        );
        
        $tavoloInfo = array_filter($this->tavoli, fn($t) => $t['id'] == $tavoloId)[0];
        
        for ($pos = 1; $pos <= $tavoloInfo['posti_totali']; $pos++) {
            if (!in_array($pos, $posizioniOccupate)) {
                return $pos;
            }
        }
        
        return 1; // Fallback
    }

    private function trovaAssegnazione($invitatoId) {
        foreach ($this->assegnazioni as $assegnazione) {
            if ($assegnazione['invitato_id'] == $invitatoId) {
                return $assegnazione;
            }
        }
        return null;
    }

    private function salvaRisultati() {
        // Inizia transazione
        $this->db->beginTransaction();
        
        try {
            // Reset assegnazioni esistenti
            $resetStmt = $this->db->prepare("UPDATE invitati SET tavolo_id = NULL, posizione_tavolo = NULL");
            $resetStmt->execute();
            
            // Salva nuove assegnazioni
            $updateStmt = $this->db->prepare(
                "UPDATE invitati SET tavolo_id = :tavolo_id, posizione_tavolo = :posizione WHERE id = :invitato_id"
            );
            
            foreach ($this->assegnazioni as $assegnazione) {
                $updateStmt->execute([
                    ':tavolo_id' => $assegnazione['tavolo_id'],
                    ':posizione' => $assegnazione['posizione'],
                    ':invitato_id' => $assegnazione['invitato_id']
                ]);
            }
            
            $this->db->commit();
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception('Errore nel salvare le assegnazioni: ' . $e->getMessage());
        }
    }

    private function getAssignmentSummary() {
        $summary = [
            'tavoli' => [],
            'statistiche' => [
                'invitati_assegnati' => count($this->assegnazioni),
                'tavoli_utilizzati' => 0,
                'collegamenti_soddisfatti' => 0,
                'conflitti_risolti' => 0
            ]
        ];

        // Raggruppa assegnazioni per tavolo
        $assegnazioniPerTavolo = [];
        foreach ($this->assegnazioni as $assegnazione) {
            $tavoloId = $assegnazione['tavolo_id'];
            if (!isset($assegnazioniPerTavolo[$tavoloId])) {
                $assegnazioniPerTavolo[$tavoloId] = [];
            }
            $assegnazioniPerTavolo[$tavoloId][] = $assegnazione;
        }

        // Crea summary per ogni tavolo
        foreach ($assegnazioniPerTavolo as $tavoloId => $assegnazioni) {
            $tavoloInfo = array_filter($this->tavoli, fn($t) => $t['id'] == $tavoloId)[0];
            
            $ospiti = [];
            foreach ($assegnazioni as $assegnazione) {
                $invitato = array_filter($this->invitati, fn($i) => $i['id'] == $assegnazione['invitato_id'])[0];
                $ospiti[] = [
                    'id' => $invitato['id'],
                    'nome' => $invitato['nome'] . ' ' . $invitato['cognome'],
                    'posizione' => $assegnazione['posizione'],
                    'intolleranze' => json_decode($invitato['intolleranze'], true) ?: []
                ];
            }
            
            usort($ospiti, fn($a, $b) => $a['posizione'] - $b['posizione']);
            
            $summary['tavoli'][] = [
                'id' => $tavoloId,
                'nome' => $tavoloInfo['nome'],
                'ospiti' => $ospiti,
                'occupazione' => count($ospiti) . '/' . $tavoloInfo['posti_totali']
            ];
        }

        $summary['statistiche']['tavoli_utilizzati'] = count($assegnazioniPerTavolo);

        return $summary;
    }
}

// Gestisci richiesta
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $generatore = new GeneratoreTavoli();
    $risultato = $generatore->genera();
    
    http_response_code($risultato['success'] ? 200 : 400);
    echo json_encode($risultato);
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metodo non supportato'
    ]);
}
?>