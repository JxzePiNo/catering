class GuestLinking {
    constructor() {
        this.linkingMode = false;
        this.selectedGuest = null;
        this.linkType = null;
        this.connections = new Map();
        this.svg = document.getElementById('connections-svg');
        
        this.init();
    }

    init() {
        this.loadConnections();
        this.setupEventListeners();
    }

    async loadConnections() {
        try {
            const response = await fetch('api/persone.php?path=connections');
            const result = await response.json();
            
            if (result.success) {
                this.connections.clear();
                result.data.forEach(conn => {
                    const key = `${Math.min(conn.invitato_a, conn.invitato_b)}-${Math.max(conn.invitato_a, conn.invitato_b)}`;
                    this.connections.set(key, conn);
                });
                this.drawAllConnections();
            }
        } catch (error) {
            console.error('Error loading connections:', error);
        }
    }

    setupEventListeners() {
        // Guest card clicks
        document.addEventListener('click', (e) => {
            const guestCard = e.target.closest('.guest-card');
            if (!guestCard) {
                if (this.linkingMode) {
                    this.exitLinkingMode();
                }
                return;
            }

            const guestId = parseInt(guestCard.dataset.guestId);

            // If in linking mode and this is not the selected guest
            if (this.linkingMode && this.selectedGuest !== guestId) {
                this.completeLink(guestId);
                return;
            }

            // Check if click was on a link button
            const linkBtn = e.target.closest('.link-btn');
            if (linkBtn) {
                e.stopPropagation();
                this.setLinkType(linkBtn.dataset.type);
                return;
            }

            // Start linking mode
            this.startLinking(guestId);
        });

        // Escape key to exit linking
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.linkingMode) {
                this.exitLinkingMode();
            }
        });

        // Window resize - redraw connections
        window.addEventListener('resize', () => {
            this.debounce(() => this.drawAllConnections(), 100);
        });
    }

    startLinking(guestId) {
        this.exitLinkingMode(); // Clear any existing state
        
        this.linkingMode = true;
        this.selectedGuest = guestId;
        
        const guestCard = document.querySelector(`[data-guest-id="${guestId}"]`);
        guestCard.classList.add('linking-active');
        
        // Show linking buttons
        const indicators = guestCard.querySelector('.linking-indicators');
        if (indicators) {
            indicators.classList.remove('hidden');
        }

        // Highlight other guest cards as potential targets
        document.querySelectorAll('.guest-card').forEach(card => {
            const cardId = parseInt(card.dataset.guestId);
            if (cardId !== guestId) {
                card.classList.add('link-target');
            }
        });

        this.showLinkingToast('Seleziona il tipo di collegamento, poi clicca su un altro invitato');
    }

    setLinkType(type) {
        this.linkType = type;
        
        // Update UI to show selected type
        const selectedCard = document.querySelector(`[data-guest-id="${this.selectedGuest}"]`);
        const buttons = selectedCard.querySelectorAll('.link-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            }
        });

        this.showLinkingToast(`Collegamento ${this.getLinkTypeLabel(type)} selezionato. Clicca su un invitato.`);
    }

    async completeLink(targetGuestId) {
        if (!this.linkType) {
            this.showError('Seleziona prima il tipo di collegamento');
            return;
        }

        try {
            const response = await fetch('api/persone.php?path=connections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invitato_a: this.selectedGuest,
                    invitato_b: targetGuestId,
                    tipo: this.linkType
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Add to local connections
                const key = `${Math.min(this.selectedGuest, targetGuestId)}-${Math.max(this.selectedGuest, targetGuestId)}`;
                this.connections.set(key, {
                    invitato_a: this.selectedGuest,
                    invitato_b: targetGuestId,
                    tipo: this.linkType
                });

                // Save to undo history
                window.undoManager?.saveState(
                    `Collegamento ${this.getLinkTypeLabel(this.linkType)} creato`,
                    {
                        type: 'connection_create',
                        sourceId: this.selectedGuest,
                        targetId: targetGuestId,
                        linkType: this.linkType
                    }
                );

                this.drawAllConnections();
                this.showSuccess('Collegamento creato con successo');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nella creazione del collegamento: ' + error.message);
        }

        this.exitLinkingMode();
    }

    exitLinkingMode() {
        this.linkingMode = false;
        this.selectedGuest = null;
        this.linkType = null;

        // Remove all linking classes
        document.querySelectorAll('.guest-card').forEach(card => {
            card.classList.remove('linking-active', 'link-target');
            const indicators = card.querySelector('.linking-indicators');
            if (indicators) {
                indicators.classList.add('hidden');
            }
        });

        // Remove active states from buttons
        document.querySelectorAll('.link-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    drawAllConnections() {
        // Clear existing connections
        this.svg.innerHTML = '';

        this.connections.forEach((connection, key) => {
            this.drawConnection(connection);
        });
    }

    drawConnection(connection) {
        const sourceCard = document.querySelector(`[data-guest-id="${connection.invitato_a}"]`);
        const targetCard = document.querySelector(`[data-guest-id="${connection.invitato_b}"]`);

        if (!sourceCard || !targetCard) return;

        const sourceRect = sourceCard.getBoundingClientRect();
        const targetRect = targetCard.getBoundingClientRect();

        // Calculate connection points (center of cards)
        const x1 = sourceRect.left + sourceRect.width / 2;
        const y1 = sourceRect.top + sourceRect.height / 2;
        const x2 = targetRect.left + targetRect.width / 2;
        const y2 = targetRect.top + targetRect.height / 2;

        // Create SVG line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', `connection-line connection-${connection.tipo}`);
        line.setAttribute('data-connection-key', `${Math.min(connection.invitato_a, connection.invitato_b)}-${Math.max(connection.invitato_a, connection.invitato_b)}`);

        // Add click handler for deletion
        line.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConnection(connection.invitato_a, connection.invitato_b);
        });

        this.svg.appendChild(line);
    }

    async deleteConnection(guestA, guestB) {
        if (!confirm('Vuoi eliminare questo collegamento?')) return;

        try {
            const response = await fetch('api/persone.php?path=connections', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invitato_a: guestA,
                    invitato_b: guestB
                })
            });

            const result = await response.json();
            
            if (result.success) {
                const key = `${Math.min(guestA, guestB)}-${Math.max(guestA, guestB)}`;
                this.connections.delete(key);
                
                // Remove line from SVG
                const line = this.svg.querySelector(`[data-connection-key="${key}"]`);
                if (line) {
                    line.remove();
                }

                this.showSuccess('Collegamento eliminato');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showError('Errore nell\'eliminazione del collegamento: ' + error.message);
        }
    }

    getLinkTypeLabel(type) {
        const labels = {
            'green': 'positivo',
            'yellow': 'neutro', 
            'red': 'negativo'
        };
        return labels[type] || type;
    }

    showLinkingToast(message) {
        this.showToast(message, 'info');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
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
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('connections-svg')) {
        window.guestLinking = new GuestLinking();
    }
});