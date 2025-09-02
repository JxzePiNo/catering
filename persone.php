<?php
require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

// Recupera invitati con informazioni tavoli
$query = "SELECT i.*, t.nome as tavolo_nome 
          FROM invitati i 
          LEFT JOIN tavoli t ON i.tavolo_id = t.id 
          ORDER BY i.cognome, i.nome";
$stmt = $db->prepare($query);
$stmt->execute();
$invitati = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Conta totale invitati
$total_invitati = count($invitati);
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?> - Persone</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/custom.css">
</head>
<body class="bg-white font-inter pb-24">
    <!-- Pattern Background -->
    <div class="fixed inset-0 bg-pattern -z-10"></div>

    <!-- Header -->
    <header class="p-6 space-y-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold text-gray-900">Gestione Invitati</h1>
            <button id="add-guest-btn" class="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-all">
                <i data-lucide="plus" class="w-5 h-5"></i>
            </button>
        </div>

        <!-- Search Bar -->
        <div class="relative">
            <i data-lucide="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"></i>
            <input type="text" 
                   id="search-guests"
                   placeholder="Cerca invitati..." 
                   class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>

        <!-- Stats & Import -->
        <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">
                <span class="font-bold" id="count-invitati"><?php echo $total_invitati; ?></span> invitati totali
            </p>
            <button id="import-excel-btn" class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                <i data-lucide="upload" class="w-4 h-4"></i>
                Importa Excel
            </button>
        </div>
    </header>

    <!-- Guests Grid -->
    <div class="px-6">
        <div id="guests-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach($invitati as $invitato): ?>
                <?php 
                $intolleranze = json_decode($invitato['intolleranze'], true) ?: [];
                ?>
                <div class="guest-card bg-white rounded-2xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-all" 
                     data-guest-id="<?php echo $invitato['id']; ?>"
                     data-linking="false">
                    
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="font-semibold text-gray-900"><?php echo htmlspecialchars($invitato['nome'] . ' ' . $invitato['cognome']); ?></h3>
                            <p class="text-sm text-gray-600">
                                <?php echo $invitato['tavolo_nome'] ? htmlspecialchars($invitato['tavolo_nome']) : 'Non assegnato'; ?>
                            </p>
                        </div>

                        <!-- Linking Controls (hidden by default) -->
                        <div class="linking-indicators hidden space-x-1">
                            <button class="link-btn link-green p-1 rounded hover:bg-green-50" data-type="green">
                                <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                            </button>
                            <button class="link-btn link-yellow p-1 rounded hover:bg-yellow-50" data-type="yellow">
                                <i data-lucide="minus" class="w-4 h-4 text-yellow-600"></i>
                            </button>
                            <button class="link-btn link-red p-1 rounded hover:bg-red-50" data-type="red">
                                <i data-lucide="x" class="w-4 h-4 text-red-600"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Badge Intolleranze -->
                    <?php if(!empty($intolleranze)): ?>
                        <div class="flex flex-wrap gap-1 mb-2">
                            <?php foreach($intolleranze as $intolleranza): ?>
                                <span class="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                                    <?php echo htmlspecialchars($intolleranza); ?>
                                </span>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <!-- Collegamenti Attivi -->
                    <div class="links-display space-y-1">
                        <!-- Popolato dinamicamente via JS -->
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Floating Menu -->
    <?php include 'components/floating-menu.php'; ?>

    <!-- Dialog Add Guest -->
    <?php include 'components/dialog-add-guest.php'; ?>

    <!-- SVG per collegamenti -->
    <svg id="connections-svg" class="fixed inset-0 pointer-events-none z-10" style="width: 100%; height: 100%;">
        <!-- Le linee di collegamento verranno inserite qui -->
    </svg>

    <!-- Scripts -->
    <script>lucide.createIcons();</script>
    <script src="assets/js/undo-redo.js"></script>
    <script src="assets/js/linking.js"></script>
    <script src="assets/js/guests.js"></script>
</body>
</html>