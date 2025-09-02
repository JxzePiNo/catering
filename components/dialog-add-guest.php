<div id="add-guest-dialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 transform transition-all">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">Aggiungi Nuovo Invitato</h2>
            <button id="close-guest-dialog" class="p-1 hover:bg-gray-100 rounded">
                <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
            </button>
        </div>
        
        <form id="add-guest-form" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input type="text" 
                           name="nome" 
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Mario">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                    <input type="text" 
                           name="cognome" 
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Rossi">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Intolleranze Alimentari</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input type="checkbox" name="intolleranze[]" value="celiaco" class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">Celiaco</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" name="intolleranze[]" value="vegano" class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">Vegano</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" name="intolleranze[]" value="lattosio" class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">Intollerante al lattosio</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" name="intolleranze[]" value="noci" class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">Allergia frutta secca</span>
                    </label>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Altre intolleranze</label>
                <input type="text" 
                       name="altre_intolleranze" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Specifica altre intolleranze...">
            </div>
            
            <div class="flex gap-3 pt-4">
                <button type="button" 
                        id="cancel-guest" 
                        class="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                    Annulla
                </button>
                <button type="submit" 
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                    Aggiungi
                </button>
            </div>
        </form>
    </div>
</div>