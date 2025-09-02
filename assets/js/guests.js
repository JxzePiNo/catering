// Guest-specific functionality
class GuestManager {
    constructor() {
        this.guests = new Map();
        this.filteredGuests = [];
        this.currentFilter = '';
        this.init();
    }

    init() {
        this.loadGuests();
        this.setupEventListeners();
    }

    async loadGuests() {
        try {
            const response = await fetch('api/persone.php');
            const result = await response.json();
            
            if (result.success) {
                this.guests.clear();
                result.data.forEach(guest => {
                    this.guests.set(guest.id, guest);
                });
                this.filteredGuests = [...result.data];
                this.renderGuests();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading guests:', error);
        }
    }

    setupEventListeners() {
        // Guest card interactions
        document.addEventListener('click', (e) => {
            const guestCard = e.target.closest('.guest-card');
            if (!guestCard) return;

            const guestId = parseInt(guestCard.dataset.guestId);
            
            // Handle context menu
            if (e.button === 2) { // Right click
                e.preventDefault();
                this.showGuestContextMenu(e, guestId);
                return;
            }
            
            // Handle edit on double click
            if (e.detail === 2) {
                this.editGuest(guestId);
                return;
            }
        });

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            const guestCard = e.target.closest('.guest-card');
            if (guestCard) {
                e.preventDefault();
                const guestId = parseInt(guestCard.dataset.guestId);
                this.showGuestContextMenu(e, guestId);
            }
        });

        // Close context menu on outside click
        document.addEventListener('click', () => {
            this.closeContextMenu();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedGuestId) {
                this.deleteGuest(this.selectedGuestId);
            }
        });
    }

    renderGuests() {
        const container = document.getElementById('guests-container');
        if (!container) return;

        container.innerHTML = '';
        
        this.filteredGuests.forEach(guest => {
            const guestCard = this.createGuestCard(guest);
            container.appendChild(guestCard);
        });

        lucide.createIcons();
    }

    createGuestCard(guest) {
        const div = document.createElement('div');
        div.className = 'guest-card bg-white rounded-2xl shadow-md p-4 cursor-pointer hover:shadow-lg transition-all';
        div.dataset.guestId = guest.id;
        div.dataset.linking = 'false';
        
        const intolleranze = guest.intolleranze || [];
        const intolleranzeHtml = intolleranze.map(int => {
            const badgeClass = this.getIntoleranzaBadgeClass(int);
            return `<span class="px-2 py-1 text-xs rounded-full ${badgeClass}">${int}</span>`;
        }).join('');
        
        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">${guest.nome} ${guest.cognome}</h3>
                    <p class="text-sm text-gray-600">${guest.tavolo_nome || 'Non assegnato'}</p>
                    ${guest.posizione_tavolo ? `<p class="text-xs text-gray-500">Posto ${guest.posizione_tavolo}</p>` : ''}
                </div>

                <div class="flex items-start gap-2">
                    ${guest.tavolo_id ? '<i data-lucide="check-circle" class="w-4 h-4 text-green-500" title="Assegnato"></i>' : ''}
                    
                    <div class="linking-indicators hidden space-x-1">
                        <button class="link-btn link-green p-1 rounded hover:bg-green-50 transition-all" data-type="green" title="Collegamento positivo">
                            <i data-lucide="heart" class="w-4 h-4 text-green-600"></i>
                        </button>
                        <button class="link-btn link-yellow p-1 rounded hover:bg-yellow-50 transition-all" data-type="yellow" title="Collegamento neutro">
                            <i data-lucide="minus" class="w-4 h-4 text-yellow-600"></i>
                        </button>
                        <button class="link-btn link-red p-1 rounded hover:bg-red-50 transition-all" data-type="red" title="Collegamento negativo">
                            <i data-lucide="x" class="w-4 h-4 text-red-600"></i>
                        </button>
                    </div>
                </div>
            </div>

            ${intolleranze.length > 0 ? `
                <div class="flex flex-wrap gap-1 mb-2">
                    ${intolleranzeHtml}
                </div>
            ` : ''}

            <div class="links-display space-y-1">
                <!-- Collegamenti vengono popolati dinamicamente -->
            </div>
        `;
        
        return div;
    }

    getIntoleranzaBadgeClass(intolleranza) {
        const classes = {
            'celiaco': 'badge-celiaco',
            'vegano': 'badge-vegano',
            'lattosio': 'badge-lattosio',
            'noci': 'badge-noci'
        };
        return classes[intolleranza.toLowerCase()] || 'badge-default';
    }

    showGuestContextMenu(event, guestId) {
        this.closeContextMenu();
        
        const menu = document.createElement('div');
        menu.id = 'guest-context-menu';
        menu.className = 'fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[150px]';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        
        const guest = this.guests.get(guestId);
        
        menu.innerHTML = `
            <button class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2" data-action="edit">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
                Modifica
            </button>
            <button class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2" data-action="assign">
                <i data-lucide="move" class="w-4 h-4"></i>
                ${guest.tavolo_id ? 'Cambia tavolo' : 'Assegna tavolo'}
            </button>
            <button class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2" data-action="duplicate">
                <i data-lucide="copy" class="w-4 h-4"></i>
                Duplica
            </button>
            <hr class="my-1">
            <button class="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2" data-action="delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                Elimina
            </button>
        `;

        // Position menu to stay within viewport
        document.body.appendChild(menu);
        
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (menuRect.right > viewportWidth) {
            menu.style.left = `${event.clientX - menuRect.width}px`;
        }
        
        if (menuRect.bottom > viewportHeight) {
            menu.style.top = `${event.clientY - menuRect.height}px`;
        }
        
        lucide.createIcons();

        // Handle menu actions
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (action) {
                this.handleGuestAction(action, guestId);
                this.closeContextMenu();
            }
        });

        this.selectedGuestId = guestId;
    }

    closeContextMenu() {
        const menu = document.getElementById('guest-context-menu');
        if (menu) {
            document.body.removeChild(menu);
        }
        this.selectedGuestId = null;
    }

    handleGuestAction(action, guestId) {
        switch (action) {
            case 'edit':
                this.editGuest(guestId);
                break;
            case 'assign':
                this.showTableAssignmentDialog(guestId);
                break;
            case 'duplicate':
                this.duplicateGuest(guestId);
                break;
            case 'delete':
                this.deleteGuest(guestId);
                break;
        }
    }

    async editGuest(guestId) {
        const guest = this.guests.get(guestId);
        if (!guest) return;

        // Create edit dialog
        const dialog = this.createEditGuestDialog(guest);
        document.body.appendChild(dialog);
        lucide.createIcons();
    }

    createEditGuestDialog(guest) {
        const dialog = document.createElement('div');
        dialog.id = 'edit-guest-dialog';
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        const intolleranze = guest.intolleranze || [];
        
        dialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Modifica Invitato</h2>
                    <button class="p-1 hover:bg-gray-100 rounded">
                        <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                    </button>
                </div>
                
                <form class="space-y-4">
                    <input type="hidden" name="id" value="${guest.id}">
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                            <input type="text" name="nome" value="${guest.nome}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                            <input type="text" name="cognome" value="${guest.cognome}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Intolleranze Alimentari</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="intolleranze[]" value="celiaco" ${intolleranze.includes('celiaco') ? 'checked' : ''} class="mr-2 rounded">
                                <span class="text-sm">Celiaco</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="intolleranze[]" value="vegano" ${intolleranze.includes('vegano') ? 'checked' : ''} class="mr-2 rounded">
                                <span class="text-sm">Vegano</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="intolleranze[]" value="lattosio" ${intolleranze.includes('lattosio') ? 'checked' : ''} class="mr-2 rounded">
                                <span class="text-sm">Intollerante al lattosio</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="intolleranze[]" value="noci" ${intolleranze.includes('noci') ? 'checked' : ''} class="mr-2 rounded">
                                <span class="text-sm">Allergia frutta secca</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 pt-4">
                        <button type="button" class="cancel-btn flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Annulla
                        </button>
                        <button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Salva
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Event listeners
        const closeBtn = dialog.querySelector('button');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        const form = dialog.querySelector('form');

        closeBtn.addEventListener('click', () => this.closeEditDialog());
        cancelBtn.addEventListener('click', () => this.closeEditDialog());
        form.addEventListener('submit', (e) => this.handleEditSubmit(e));

        return dialog;
    }

    closeEditDialog() {
        const dialog = document.getElementById('edit-guest-dialog');
        if (dialog) {
            document.body.removeChild(dialog);
        }
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.intolleranze = formData.getAll('intolleranze[]');

        try {
            const response = await fetch('api/persone.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.closeEditDialog();
                this.loadGuests(); // Reload to get updated data
                window.weddingApp?.showSuccess('Invitato aggiornato con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            window.weddingApp?.showError('Errore nell\'aggiornamento: ' + error.message);
        }
    }

    async deleteGuest(guestId) {
        const guest = this.guests.get(guestId);
        if (!guest) return;
        
        if (!confirm(`Sei sicuro di voler eliminare ${guest.nome} ${guest.cognome}?`)) {
            return;
        }

        try {
            const response = await fetch('api/persone.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: guestId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.guests.delete(guestId);
                this.loadGuests(); // Reload to update UI
                window.weddingApp?.showSuccess('Invitato eliminato con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            window.weddingApp?.showError('Errore nell\'eliminazione: ' + error.message);
        }
    }

    async duplicateGuest(guestId) {
        const guest = this.guests.get(guestId);
        if (!guest) return;

        const duplicateData = {
            nome: guest.nome,
            cognome: guest.cognome + ' (copia)',
            intolleranze: guest.intolleranze || []
        };

        try {
            const response = await fetch('api/persone.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(duplicateData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.loadGuests(); // Reload to show new guest
                window.weddingApp?.showSuccess('Invitato duplicato con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            window.weddingApp?.showError('Errore nella duplicazione: ' + error.message);
        }
    }

    showTableAssignmentDialog(guestId) {
        // TODO: Implement table assignment dialog
        window.weddingApp?.showInfo('Funzionalità di assegnazione tavolo in sviluppo');
    }

    filterGuests(query) {
        if (!query.trim()) {
            this.filteredGuests = Array.from(this.guests.values());
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredGuests = Array.from(this.guests.values()).filter(guest => 
                guest.nome.toLowerCase().includes(searchTerm) ||
                guest.cognome.toLowerCase().includes(searchTerm) ||
                guest.intolleranze?.some(int => int.toLowerCase().includes(searchTerm))
            );
        }
        
        this.renderGuests();
        this.updateStats();
    }

    updateStats() {
        const totalElement = document.getElementById('count-invitati');
        if (totalElement) {
            totalElement.textContent = this.guests.size;
        }

        // Update other stats if needed
        const assignedGuests = Array.from(this.guests.values()).filter(g => g.tavolo_id).length;
        const unassignedGuests = this.guests.size - assignedGuests;
        
        // Add stats display if needed
        this.updateStatsDisplay({
            total: this.guests.size,
            assigned: assignedGuests,
            unassigned: unassignedGuests
        });
    }

    updateStatsDisplay(stats) {
        // Create or update stats display
        let statsElement = document.getElementById('guest-stats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.id = 'guest-stats';
            statsElement.className = 'flex gap-4 text-sm text-gray-600';
            
            const header = document.querySelector('header .flex');
            if (header) {
                header.appendChild(statsElement);
            }
        }
        
        statsElement.innerHTML = `
            <span class="flex items-center gap-1">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                Assegnati: <strong>${stats.assigned}</strong>
            </span>
            <span class="flex items-center gap-1">
                <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                Non assegnati: <strong>${stats.unassigned}</strong>
            </span>
        `;
    }
}

// Initialize guest manager
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('guests-container')) {
        window.guestManager = new GuestManager();
    }
});