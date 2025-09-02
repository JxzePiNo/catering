<div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-50">
    <!-- Pulsante Genera (separato) -->
    <button id="genera-btn" class="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold hover:bg-blue-700 transition-all">
        Genera
    </button>
    
    <!-- Menu principale -->
    <div class="bg-white rounded-2xl shadow-lg px-6 py-3 flex items-center gap-6">
        <a href="index.php" class="p-2 hover:bg-gray-100 rounded-lg transition-all <?php echo basename($_SERVER['PHP_SELF']) == 'index.php' ? 'text-blue-600' : 'text-gray-600'; ?>">
            <i data-lucide="home" class="w-5 h-5"></i>
        </a>
        
        <button id="add-main-btn" class="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all transform hover:scale-105">
            <i data-lucide="plus" class="w-6 h-6"></i>
        </button>
        
        <a href="persone.php" class="p-2 hover:bg-gray-100 rounded-lg transition-all <?php echo basename($_SERVER['PHP_SELF']) == 'persone.php' ? 'text-blue-600' : 'text-gray-600'; ?>">
            <i data-lucide="users" class="w-5 h-5"></i>
        </a>
    </div>
</div>