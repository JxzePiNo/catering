<?php
/* api/persone.php
 * CRUD invitati + collegamenti
 * PHP 8.0+, MySQL 8.0
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;   // pre-flight CORS
}

require_once '../config/database.php';

class PersoneAPI {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    /* === ENTRYPOINT ====================================================== */
    public function handle(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $path   = $_GET['path'] ?? '';

        try {
            match ("$method|$path") {
                'GET|'                => $this->listGuests(),
                'GET|connections'     => $this->listConnections(),
                'POST|'               => $this->createGuest(),
                'POST|connections'    => $this->createConnection(),
                'POST|import'         => $this->importExcel(),
                'PUT|'                => $this->updateGuest(),
                'PUT|connections'     => $this->updateConnection(),
                'DELETE|'             => $this->deleteGuest(),
                'DELETE|connections'  => $this->deleteConnection(),
                default               => $this->error('Metodo o percorso non supportato', 405),
            };
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /* === INVITATI ======================================================== */
    private function listGuests(): void {
        $search    = $_GET['search']     ?? '';
        $tavoloId  = $_GET['tavolo_id']  ?? '';

        $sql = "SELECT i.*, t.nome AS tavolo_nome
                  FROM invitati i
             LEFT JOIN tavoli t ON t.id = i.tavolo_id";
        $where = [];
        $par   = [];

        if ($search !== '') {
            $where[]      = "(i.nome LIKE :q OR i.cognome LIKE :q)";
            $par[':q']    = "%$search%";
        }
        if ($tavoloId !== '') {
            $where[]      = "i.tavolo_id = :tid";
            $par[':tid']  = $tavoloId;
        }
        if ($where) $sql .= ' WHERE '.implode(' AND ', $where);
        $sql .= ' ORDER BY i.cognome, i.nome';

        $st = $this->db->prepare($sql);
        foreach ($par as $k=>$v) $st->bindValue($k,$v);
        $st->execute();
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) $r['intolleranze'] = json_decode($r['intolleranze'], true) ?: [];
        $this->ok($rows);
    }

    private function createGuest(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        $this->validateGuest($in);

        $int = array_merge(
            $in['intolleranze']   ?? [],
            $in['altre_intolleranze'] ? array_map('trim', explode(',', $in['altre_intolleranze'])) : []
        );
        $int = array_values(array_unique(array_filter($int)));

        $sql = "INSERT INTO invitati
                  (nome, cognome, intolleranze, tavolo_id, posizione_tavolo)
                VALUES
                  (:nome, :cognome, :int, :tid, :pos)";
        $st  = $this->db->prepare($sql);
        $st->execute([
            ':nome' => $in['nome'],
            ':cognome' => $in['cognome'],
            ':int'  => json_encode($int, JSON_UNESCAPED_UNICODE),
            ':tid'  => $in['tavolo_id']        ?? null,
            ':pos'  => $in['posizione_tavolo'] ?? null,
        ]);
        $id = $this->db->lastInsertId();

        $new = $this->getGuestById($id);
        $this->ok($new,'Invitato creato',201);
    }

    private function updateGuest(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!isset($in['id'])) $this->error('ID mancante',400);

        $allowed = ['nome','cognome','tavolo_id','posizione_tavolo','intolleranze'];
        $set = $par = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f,$in)) {
                $set[] = "$f = :$f";
                $par[":$f"] = ($f==='intolleranze') ? json_encode($in[$f]) : $in[$f];
            }
        }
        if (!$set) $this->error('Nessun campo da aggiornare',400);

        $par[':id']=$in['id'];
        $sql = "UPDATE invitati SET ".implode(',',$set)." WHERE id=:id";
        $st  = $this->db->prepare($sql);
        $st->execute($par);

        $this->ok(['rows'=>$st->rowCount()],'Invitato aggiornato');
    }

    private function deleteGuest(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!isset($in['id'])) $this->error('ID mancante',400);

        // prima elimino i collegamenti
        $st = $this->db->prepare(
            "DELETE FROM collegamenti_invitati
             WHERE invitato_a=:id OR invitato_b=:id");
        $st->execute([':id'=>$in['id']]);

        $st = $this->db->prepare("DELETE FROM invitati WHERE id=:id");
        $st->execute([':id'=>$in['id']]);
        $this->ok(['rows'=>$st->rowCount()],'Invitato eliminato');
    }

    /* === COLLEGAMENTI ==================================================== */
    private function listConnections(): void {
        $gid = $_GET['invitato_id'] ?? '';
        $sql = "SELECT * FROM collegamenti_invitati";
        $par=[];
        if ($gid!==''){
            $sql.=" WHERE invitato_a=:g OR invitato_b=:g";
            $par[':g']=$gid;
        }
        $st=$this->db->prepare($sql);
        foreach($par as $k=>$v) $st->bindValue($k,$v);
        $st->execute();
        $this->ok($st->fetchAll(PDO::FETCH_ASSOC));
    }

    private function createConnection(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        $this->validateConnection($in);

        [$a,$b] = $this->orderedPair($in['invitato_a'],$in['invitato_b']);

        $sql="INSERT INTO collegamenti_invitati (invitato_a,invitato_b,tipo)
              VALUES (:a,:b,:t)
              ON DUPLICATE KEY UPDATE tipo=:t2";
        $st=$this->db->prepare($sql);
        $st->execute([':a'=>$a,':b'=>$b,':t'=>$in['tipo'],':t2'=>$in['tipo']]);
        $this->ok(['rows'=>$st->rowCount()],'Collegamento salvato',201);
    }

    private function deleteConnection(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!isset($in['invitato_a'],$in['invitato_b']))
            $this->error('ID mancanti',400);

        [$a,$b] = $this->orderedPair($in['invitato_a'],$in['invitato_b']);
        $st=$this->db->prepare(
            "DELETE FROM collegamenti_invitati WHERE invitato_a=:a AND invitato_b=:b");
        $st->execute([':a'=>$a,':b'=>$b]);
        $this->ok(['rows'=>$st->rowCount()],'Collegamento eliminato');
    }

    private function updateConnection(): void {
        $in = json_decode(file_get_contents('php://input'), true) ?: [];
        $this->validateConnection($in);

        [$a,$b] = $this->orderedPair($in['invitato_a'],$in['invitato_b']);

        $st=$this->db->prepare(
            "UPDATE collegamenti_invitati SET tipo=:t WHERE invitato_a=:a AND invitato_b=:b");
        $st->execute([':t'=>$in['tipo'],':a'=>$a,':b'=>$b]);
        $this->ok(['rows'=>$st->rowCount()],'Collegamento aggiornato');
    }

    /* === IMPORT EXCEL (stub) ============================================ */
    private function importExcel(): void {
        $this->ok(null,'Funzionalità import Excel in sviluppo',202);
    }

    /* === HELPERS ========================================================= */
    private function validateGuest(array $d): void {
        foreach (['nome','cognome'] as $f)
            if (empty($d[$f])) $this->error("$f obbligatorio",400);
        if (mb_strlen($d['nome'])>50||mb_strlen($d['cognome'])>50)
            $this->error('Nome/Cognome troppo lunghi',400);
    }

    private function validateConnection(array $d): void {
        if (!isset($d['invitato_a'],$d['invitato_b'],$d['tipo']))
            $this->error('Dati collegamento incompleti',400);
        if (!in_array($d['tipo'],['green','yellow','red'],true))
            $this->error('Tipo collegamento non valido',400);
    }

    private function orderedPair(int $x,int $y): array {
        return $x<$y ? [$x,$y] : [$y,$x];
    }

    private function getGuestById(int $id): array {
        $st=$this->db->prepare(
            "SELECT i.*, t.nome AS tavolo_nome
               FROM invitati i
          LEFT JOIN tavoli t ON t.id=i.tavolo_id
              WHERE i.id=:id");
        $st->execute([':id'=>$id]);
        $r=$st->fetch(PDO::FETCH_ASSOC);
        $r['intolleranze']=json_decode($r['intolleranze'],true)?:[];
        return $r;
    }

    /* === RESPONSE WRAPPERS ============================================== */
    private function ok(mixed $data=null,string $msg='OK',int $code=200): void {
        http_response_code($code);
        echo json_encode(['success'=>true,'message'=>$msg,'data'=>$data],JSON_UNESCAPED_UNICODE);
        exit;
    }
    private function error(string $msg,int $code=400): void {
        http_response_code($code);
        echo json_encode(['success'=>false,'message'=>$msg],JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/* === RUN =============================================================== */
(new PersoneAPI())->handle();