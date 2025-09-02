<header class="p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Stanza del Belli</h1>
            <p class="text-gray-600">Torrita di Siena, SI</p>
        </div>
        
        <div class="flex items-center gap-4">
            <!-- Zoom Controls -->
            <div class="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <button id="zoom-out" class="p-1 hover:bg-gray-100 rounded">
                    <i data-lucide="minus" class="w-4 h-4 text-gray-600"></i>
                </button>
                <span id="zoom-level" class="text-sm text-gray-600 px-2">100%</span>
                <button id="zoom-in" class="p-1 hover:bg-gray-100 rounded">
                    <i data-lucide="plus" class="w-4 h-4 text-gray-600"></i>
                </button>
            </div>
            
            <!-- Reset View -->
            <button id="reset-view" class="p-2 hover:bg-gray-100 rounded-lg" title="Reset Vista">
                <i data-lucide="home" class="w-5 h-5 text-gray-600"></i>
            </button>
        </div>
    </div>
</header>