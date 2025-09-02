<?php
require_once 'config/database.php';
$database = new Database();
$db = $database->getConnection();

// Recupera tavoli esistenti
$query = "SELECT * FROM tavoli ORDER BY created_at ASC";
$stmt = $db->prepare($query);
$stmt->execute();
$tavoli = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?> - Home</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/custom.css">
</head>
<body class="bg-white font-inter">
    <!-- Pattern Background -->
    <div class="fixed inset-0 bg-pattern -z-10"></div>

    <?php include 'components/header.php'; ?>

    <!-- Main Canvas Area -->
    <div id="canvas-container" class="relative w-full h-screen overflow-hidden cursor-move">
        <div id="canvas" class="relative w-full h-full" style="transform: translate(0px, 0px) scale(1);">
            <?php foreach($tavoli as $tavolo): ?>
                <div class="table-card bg-white rounded-2xl shadow-md p-4 absolute cursor-pointer hover:shadow-lg transition-all" 
                     data-table-id="<?php echo $tavolo['id']; ?>"
                     style="left: <?php echo $tavolo['posizione_x']; ?>px; top: <?php echo $tavolo['posizione_y']; ?>px;">
                    
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-semibold text-gray-900 text-sm"><?php echo htmlspecialchars($tavolo['nome']); ?></h3>
                        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            0/<?php echo $tavolo['posti_totali']; ?>
                        </span>
                    </div>

                    <!-- Visualizzazione forma tavolo -->
                    <div class="table-shape mb-2">
                        <?php if($tavolo['forma'] == 'rotondo'): ?>
                            <div class="w-16 h-16 bg-gray-100 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                <i data-lucide="circle" class="w-6 h-6 text-gray-600"></i>
                            </div>
                        <?php else: ?>
                            <div class="w-20 h-12 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center">
                                <i data-lucide="rectangle-horizontal" class="w-6 h-6 text-gray-600"></i>
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- Indicatori -->
                    <div class="flex gap-1">
                        <?php if($tavolo['capotavola']): ?>
                            <span class="w-2 h-2 bg-blue-600 rounded-full" title="Capotavola"></span>
                        <?php endif; ?>
                        <span class="w-2 h-2 bg-gray-300 rounded-full" title="Intolleranze"></span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Floating Menu -->
    <?php include 'components/floating-menu.php'; ?>

    <!-- Dialog Add Table -->
    <?php include 'components/dialog-add-table.php'; ?>

    <!-- Undo/Redo Buttons -->
    <div class="fixed top-4 right-4 flex gap-2">
        <button id="undo-btn" class="bg-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50" disabled>
            <i data-lucide="undo2" class="w-5 h-5 text-gray-600"></i>
        </button>
        <button id="redo-btn" class="bg-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50" disabled>
            <i data-lucide="redo2" class="w-5 h-5 text-gray-600"></i>
        </button>
    </div>

    <!-- Scripts -->
    <script>lucide.createIcons();</script>
    <script src="assets/js/undo-redo.js"></script>
    <script src="assets/js/canvas.js"></script>
    <script src="assets/js/drag-drop.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>