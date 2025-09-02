<div id="add-table-dialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 transform transition-all">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Aggiungi Nuovo Tavolo</h2>
            <button id="close-table-dialog" class="p-1 hover:bg-gray-100 rounded">
                <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
            </button>
        </div>
        
        <form id="add-table-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome Tavolo</label>
                <input type="text" 
                       name="nome" 
                       required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="es. Tavolo Sposi">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Numero Persone</label>
                <input type="number" 
                       name="posti_totali" 
                       min="2" 
                       max="20" 
                       required
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="8">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Forma Tavolo</label>
                <select name="forma" 
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="rotondo">Rotondo</option>
                    <option value="rettangolare">Rettangolare</option>
                </select>
            </div>
            
            <!-- Dimensioni Dinamiche -->
            <div id="dimensioni-container" class="space-y-2">
                <div id="dimensioni-rotondo" class="hidden">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Diametro (cm)</label>
                    <input type="number" 
                           name="diametro" 
                           min="80" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="150">
                </div>
                
                <div id="dimensioni-rettangolare" class="space-y-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Lunghezza (cm)</label>
                        <input type="number" 
                               name="lunghezza" 
                               min="100" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="200">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Larghezza (cm)</label>
                        <input type="number" 
                               name="larghezza" 
                               min="60" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="80">
                    </div>
                </div>
            </div>
            
            <div id="capotavola-container">
                <label class="flex items-center">
                    <input type="checkbox" name="capotavola" class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm font-medium text-gray-700">Capotavola</span>
                </label>
            </div>
            
            <div class="flex gap-3 pt-4">
                <button type="button" 
                        id="cancel-table" 
                        class="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                    Annulla
                </button>
                <button type="submit" 
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                    Conferma
                </button>
            </div>
        </form>
    </div>
</div>