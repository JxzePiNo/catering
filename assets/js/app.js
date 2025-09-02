// Main Application JavaScript
class WeddingTablesApp {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupFloatingMenu();
        this.setupDialogs();
        this.initPageSpecificFeatures();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('persone.php')) return 'persone';
        return 'index';
    }

    setupGlobalEventListeners() {
        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'add-table-form') {
                e.preventDefault();
                this.handleAddTable(e.target);
            } else if (e.target.id === 'add-guest-form') {
                e.preventDefault();
                this.handleAddGuest(e.target);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('search-guests');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchGuests(e.target.value);
            }, 300));
        }

        // State restoration
        document.addEventListener('stateRestore', (e) => {
            this.handleStateRestore(e.detail);
        });
    }

    setupFloatingMenu() {
        const addMainBtn = document.getElementById('add-main-btn');
        const generaBtn = document.getElementById('genera-btn');

        if (addMainBtn) {
            addMainBtn.addEventListener('click', () => {
                if (this.currentPage === 'index') {
                    this.openAddTableDialog();
                } else if (this.currentPage === 'persone') {
                    this.openAddGuestDialog();
                }
            });
        }

        if (generaBtn) {
            generaBtn.addEventListener('click', () => {
                this.generateTableAssignments();
            });
        }
    }

    setupDialogs() {
        // Table dialog
        const addTableDialog = document.getElementById('add-table-dialog');
        if (addTableDialog) {
            const closeBtn = document.getElementById('close-table-dialog');
            const cancelBtn = document.getElementById('cancel-table');
            const formaSelect = addTableDialog.querySelector('[name="forma"]');

            closeBtn?.addEventListener('click', () => this.closeDialog('add-table-dialog'));
            cancelBtn?.addEventListener('click', () => this.closeDialog('add-table-dialog'));
            
            if (formaSelect) {
                formaSelect.addEventListener('change', (e) => {
                    this.updateDimensionFields(e.target.value);
                });
                // Initialize on page load
                this.updateDimensionFields(formaSelect.value);
            }
        }

        // Guest dialog
        const addGuestDialog = document.getElementById('add-guest-dialog');
        if (addGuestDialog) {
            const closeBtn = document.getElementById('close-guest-dialog');
            const cancelBtn = document.getElementById('cancel-guest');

            closeBtn?.addEventListener('click', () => this.closeDialog('add-guest-dialog'));
            cancelBtn?.addEventListener('click', () => this.closeDialog('add-guest-dialog'));
        }

        // Close dialogs on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('fixed') && e.target.classList.contains('inset-0')) {
                const dialogId = e.target.id;
                if (dialogId) this.closeDialog(dialogId);
            }
        });
    }

    initPageSpecificFeatures() {
        if (this.currentPage === 'persone') {
            this.initGuestFeatures();
        }
    }

    initGuestFeatures() {
        // Import Excel button
        const importBtn = document.getElementById('import-excel-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportDialog();
            });
        }
    }

    // Dialog Management
    openAddTableDialog() {
        this.openDialog('add-table-dialog');
    }

    openAddGuestDialog() {
        this.openDialog('add-guest-dialog');
    }

    openDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus first input
            const firstInput = dialog.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.classList.add('hidden');
            document.body.style.overflow = '';
            
            // Reset form
            const form = dialog.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    updateDimensionFields(forma) {
        const rotondoDiv = document.getElementById('dimensioni-rotondo');
        const rettangolareDiv = document.getElementById('dimensioni-rettangolare');
        const capotavolaContainer = document.getElementById('capotavola-container');

        if (forma === 'rotondo') {
            rotondoDiv?.classList.remove('hidden');
            rettangolareDiv?.classList.add('hidden');
            capotavolaContainer?.classList.add('hidden');
        } else {
            rotondoDiv?.classList.add('hidden');
            rettangolareDiv?.classList.remove('hidden');
            capotavolaContainer?.classList.remove('hidden');
        }
    }

    // Form Handlers
    async handleAddTable(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert to appropriate types
        data.posti_totali = parseInt(data.posti_totali);
        data.capotavola = data.capotavola === 'on';
        
        if (data.forma === 'rotondo') {
            data.diametro = parseInt(data.diametro);
        } else {
            data.lunghezza = parseInt(data.lunghezza);
            data.larghezza = parseInt(data.larghezza);
        }

        // Add random position
        data.posizione_x = Math.floor(Math.random() * 400) + 100;
        data.posizione_y = Math.floor(Math.random() * 300) + 100;

        try {
            this.showLoading(form);
            
            const response = await fetch('api/tavoli.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                // Add table to page
                this.addTableToCanvas(result.data);
                
                // Save to undo history
                window.undoManager?.saveState(
                    `Tavolo "${data.nome}" creato`,
                    {
                        type: 'table_create',
                        tableData: result.data
                    }
                );
                
                this.closeDialog('add-table-dialog');
                this.showSuccess('Tavolo creato con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nella creazione del tavolo: ' + error.message);
        } finally {
            this.hideLoading(form);
        }
    }

    async handleAddGuest(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Handle multiple intolleranze checkboxes
        const intolleranze = formData.getAll('intolleranze[]');
        data.intolleranze = intolleranze;

        try {
            this.showLoading(form);
            
            const response = await fetch('api/persone.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                // Add guest to page
                this.addGuestToGrid(result.data);
                
                // Update count
                this.updateGuestCount();
                
                // Save to undo history
                window.undoManager?.saveState(
                    `Invitato "${data.nome} ${data.cognome}" creato`,
                    {
                        type: 'guest_create',
                        guestData: result.data
                    }
                );
                
                this.closeDialog('add-guest-dialog');
                this.showSuccess('Invitato aggiunto con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nell\'aggiunta dell\'invitato: ' + error.message);
        } finally {
            this.hideLoading(form);
        }
    }

    // UI Updates
    addTableToCanvas(tableData) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const tableCard = this.createTableCard(tableData);
        canvas.appendChild(tableCard);
        
        // Initialize icons
        lucide.createIcons();
    }

    createTableCard(tableData) {
        const div = document.createElement('div');
        div.className = 'table-card bg-white rounded-2xl shadow-md p-4 absolute cursor-pointer hover:shadow-lg transition-all';
        div.dataset.tableId = tableData.id;
        div.style.left = `${tableData.posizione_x}px`;
        div.style.top = `${tableData.posizione_y}px`;
        
        const forma = tableData.forma;
        const dimensioni = tableData.dimensioni;
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-semibold text-gray-900 text-sm">${tableData.nome}</h3>
                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    0/${tableData.posti_totali}
                </span>
            </div>

            <div class="table-shape mb-2">
                ${forma === 'rotondo' ? 
                    '<div class="w-16 h-16 bg-gray-100 rounded-full border-2 border-gray-300 flex items-center justify-center"><i data-lucide="circle" class="w-6 h-6 text-gray-600"></i></div>' :
                    '<div class="w-20 h-12 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center"><i data-lucide="rectangle-horizontal" class="w-6 h-6 text-gray-600"></i></div>'
                }
            </div>

            <div class="flex gap-1">
                ${tableData.capotavola ? '<span class="w-2 h-2 bg-blue-600 rounded-full" title="Capotavola"></span>' : ''}
                <span class="w-2 h-2 bg-gray-300 rounded-full" title="Intolleranze"></span>
            </div>
        `;
        
        return div;
    }

    addGuestToGrid(guestData) {
        const container = document.getElementById('guests-container');
        if (!container) return;

        const guestCard = this.createGuestCard(guestData);
        container.appendChild(guestCard);
        
        // Initialize icons
        lucide.createIcons();
    }

    createGuestCard(guestData) {
        const div = document.createElement('div');
        div.className = 'guest-card bg-white rounded-2xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-all';
        div.dataset.guestId = guestData.id;
        div.dataset.linking = 'false';
        
        const intolleranze = guestData.intolleranze || [];
        const intolleranzeHtml = intolleranze.map(int => 
            `<span class="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">${int}</span>`
        ).join('');
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-semibold text-gray-900">${guestData.nome} ${guestData.cognome}</h3>
                    <p class="text-sm text-gray-600">${guestData.tavolo_nome || 'Non assegnato'}</p>
                </div>

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

            ${intolleranze.length > 0 ? `<div class="flex flex-wrap gap-1 mb-2">${intolleranzeHtml}</div>` : ''}

            <div class="links-display space-y-1"></div>
        `;
        
        return div;
    }

    updateGuestCount() {
        const countElement = document.getElementById('count-invitati');
        if (countElement) {
            const currentCount = document.querySelectorAll('.guest-card').length;
            countElement.textContent = currentCount;
        }
    }

    // Search
    async searchGuests(query) {
        if (!query.trim()) {
            this.loadAllGuests();
            return;
        }

        try {
            const response = await fetch(`api/persone.php?search=${encodeURIComponent(query)}`);
            const result = await response.json();
            
            if (result.success) {
                this.updateGuestsGrid(result.data);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    async loadAllGuests() {
        try {
            const response = await fetch('api/persone.php');
            const result = await response.json();
            
            if (result.success) {
                this.updateGuestsGrid(result.data);
            }
        } catch (error) {
            console.error('Load guests error:', error);
        }
    }

    updateGuestsGrid(guests) {
        const container = document.getElementById('guests-container');
        if (!container) return;

        container.innerHTML = '';
        guests.forEach(guest => {
            const guestCard = this.createGuestCard(guest);
            container.appendChild(guestCard);
        });

        lucide.createIcons();
        this.updateGuestCount();
    }

    // Generate assignments
        // Generate assignments
    async generateTableAssignments() {
        if (!confirm('Vuoi generare automaticamente la disposizione degli invitati ai tavoli?')) {
            return;
        }

        try {
            this.showGenerationLoading();
            
            const response = await fetch('api/genera.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                window.undoManager?.saveState(
                    'Generazione automatica disposizione tavoli',
                    {
                        type: 'table_generation',
                        assignments: result.data
                    }
                );
                
                this.showGenerationResults(result.data);
                this.showSuccess('Disposizione generata con successo!');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nella generazione: ' + error.message);
        } finally {
            this.hideGenerationLoading();
        }
    }

    showGenerationResults(assignments) {
        // Show results in a modal or update the UI
        console.log('Generation results:', assignments);
        // TODO: Implement results display
    }

    showGenerationLoading() {
        const generaBtn = document.getElementById('genera-btn');
        if (generaBtn) {
            generaBtn.disabled = true;
            generaBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin mr-2"></i>Generazione...';
            lucide.createIcons();
        }
    }

    hideGenerationLoading() {
        const generaBtn = document.getElementById('genera-btn');
        if (generaBtn) {
            generaBtn.disabled = false;
            generaBtn.innerHTML = 'Genera';
        }
    }

    // Import Dialog
    showImportDialog() {
        // Create dynamic import dialog
        const dialog = document.createElement('div');
        dialog.id = 'import-dialog';
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Importa da Excel</h2>
                    <button class="p-1 hover:bg-gray-100 rounded">
                        <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <i data-lucide="upload-cloud" class="w-12 h-12 text-gray-400 mx-auto mb-2"></i>
                        <p class="text-gray-600 mb-2">Trascina il file Excel qui o</p>
                        <label class="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-all">
                            Seleziona File
                            <input type="file" class="hidden" accept=".xlsx,.xls" />
                        </label>
                    </div>
                    
                    <div class="text-sm text-gray-500">
                        <p class="font-medium mb-1">Formato richiesto:</p>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Colonna A: Nome</li>
                            <li>Colonna B: Cognome</li>
                            <li>Colonna C: Intolleranze (separate da virgola)</li>
                        </ul>
                    </div>
                </div>
                
                <div class="flex gap-3 pt-4">
                    <button class="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                        Annulla
                    </button>
                    <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all" disabled>
                        Importa
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        lucide.createIcons();

        // Setup event listeners
        const closeBtn = dialog.querySelector('button');
        const cancelBtn = dialog.querySelectorAll('button')[1];
        const fileInput = dialog.querySelector('input[type="file"]');
        const importBtn = dialog.querySelectorAll('button')[2];

        closeBtn.addEventListener('click', () => this.closeImportDialog());
        cancelBtn.addEventListener('click', () => this.closeImportDialog());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importBtn.disabled = false;
                importBtn.addEventListener('click', () => this.handleExcelImport(e.target.files[0]));
            }
        });
    }

    closeImportDialog() {
        const dialog = document.getElementById('import-dialog');
        if (dialog) {
            document.body.removeChild(dialog);
        }
    }

    async handleExcelImport(file) {
        const formData = new FormData();
        formData.append('excel_file', file);

        try {
            const response = await fetch('api/persone.php?path=import', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.closeImportDialog();
                this.showSuccess('Import completato con successo');
                this.loadAllGuests();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nell\'import: ' + error.message);
        }
    }

    // State Restoration
    handleStateRestore(detail) {
        const { state, description } = detail;
        
        switch (state.type) {
            case 'table_move':
                this.restoreTablePosition(state);
                break;
            case 'table_create':
                this.removeTableFromCanvas(state.tableData.id);
                break;
            case 'guest_create':
                this.removeGuestFromGrid(state.guestData.id);
                break;
            case 'connection_create':
                this.removeConnection(state.sourceId, state.targetId);
                break;
            case 'table_generation':
                this.restorePreGenerationState();
                break;
        }
        
        this.showInfo(`Ripristinato: ${description}`);
    }

    restoreTablePosition(state) {
        const tableElement = document.querySelector(`[data-table-id="${state.tableId}"]`);
        if (tableElement) {
            tableElement.style.left = `${state.oldPosition.x}px`;
            tableElement.style.top = `${state.oldPosition.y}px`;
        }
    }

    removeTableFromCanvas(tableId) {
        const tableElement = document.querySelector(`[data-table-id="${tableId}"]`);
        if (tableElement) {
            tableElement.remove();
        }
    }

    removeGuestFromGrid(guestId) {
        const guestElement = document.querySelector(`[data-guest-id="${guestId}"]`);
        if (guestElement) {
            guestElement.remove();
            this.updateGuestCount();
        }
    }

    removeConnection(sourceId, targetId) {
        if (window.guestLinking) {
            window.guestLinking.deleteConnection(sourceId, targetId);
        }
    }

    restorePreGenerationState() {
        // Reset all table assignments
        this.loadAllGuests();
    }

    // UI Helpers
    showLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }
    }

    hideLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            error: 'bg-red-500'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all transform translate-x-full max-w-sm`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);
        
        const duration = type === 'error' ? 4000 : 3000;
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.weddingApp = new WeddingTablesApp();
});