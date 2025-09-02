class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.isDragging = false;
        this.startPos = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.snapToGrid = false;
        this.gridSize = 20;
        
        this.init();
    }

    init() {
        this.setupTableDragging();
        this.setupKeyboardControls();
    }

    setupTableDragging() {
        document.addEventListener('mousedown', (e) => {
            const tableCard = e.target.closest('.table-card');
            if (!tableCard) return;

            this.startDrag(tableCard, e);
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.updateDrag(e);
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.endDrag(e);
        });

        // Touch support
        this.setupTouchDragging();
    }

    setupTouchDragging() {
        document.addEventListener('touchstart', (e) => {
            const tableCard = e.target.closest('.table-card');
            if (!tableCard) return;

            const touch = e.touches[0];
            this.startDrag(tableCard, {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            });
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            
            const touch = e.touches[0];
            this.updateDrag({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            this.endDrag(e);
        });
    }

    startDrag(element, event) {
        event.preventDefault();
        
        this.draggedElement = element;
        this.isDragging = true;
        
        // Get current position
        const rect = element.getBoundingClientRect();
        const containerRect = document.getElementById('canvas').getBoundingClientRect();
        
        // Calculate offset from mouse to element top-left
        this.offset.x = event.clientX - rect.left;
        this.offset.y = event.clientY - rect.top;
        
        // Store original position for undo
        this.originalPosition = {
            x: parseInt(element.style.left) || 0,
            y: parseInt(element.style.top) || 0
        };

        // Add dragging class
        element.classList.add('dragging');
        
        // Bring to front
        element.style.zIndex = '1000';
        
        // Change cursor
        document.body.style.cursor = 'grabbing';
    }

    updateDrag(event) {
        if (!this.isDragging || !this.draggedElement) return;

        // Convert screen coordinates to canvas coordinates
        const canvasCoords = window.tableCanvas ? 
            window.tableCanvas.screenToCanvas(event.clientX - this.offset.x, event.clientY - this.offset.y) :
            { x: event.clientX - this.offset.x, y: event.clientY - this.offset.y };

        let newX = canvasCoords.x;
        let newY = canvasCoords.y;

        // Snap to grid if enabled
        if (this.snapToGrid) {
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        // Constrain to canvas bounds
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const elementRect = this.draggedElement.getBoundingClientRect();
        
        newX = Math.max(0, Math.min(canvasRect.width - elementRect.width / (window.tableCanvas?.zoom || 1), newX));
        newY = Math.max(0, Math.min(canvasRect.height - elementRect.height / (window.tableCanvas?.zoom || 1), newY));

        // Update position
        this.draggedElement.style.left = `${newX}px`;
        this.draggedElement.style.top = `${newY}px`;
    }

    async endDrag(event) {
        if (!this.isDragging || !this.draggedElement) return;

        const element = this.draggedElement;
        const tableId = element.dataset.tableId;
        const newX = parseInt(element.style.left);
        const newY = parseInt(element.style.top);

        // Remove dragging styles
        element.classList.remove('dragging');
        element.style.zIndex = '';
        document.body.style.cursor = '';

        // Check if position actually changed
        if (newX !== this.originalPosition.x || newY !== this.originalPosition.y) {
            // Save to undo history
            window.undoManager?.saveState(
                `Spostato ${element.querySelector('h3').textContent}`,
                {
                    type: 'table_move',
                    tableId: tableId,
                    oldPosition: this.originalPosition,
                    newPosition: { x: newX, y: newY }
                }
            );

            // Save to database
            try {
                await fetch('api/tavoli.php', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: tableId,
                        posizione_x: newX,
                        posizione_y: newY
                    })
                });
            } catch (error) {
                console.error('Error saving table position:', error);
                this.showError('Errore nel salvare la posizione del tavolo');
            }
        }

        // Reset drag state
        this.draggedElement = null;
        this.isDragging = false;
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Toggle grid snap with G key
            if (e.key === 'g' || e.key === 'G') {
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.snapToGrid = !this.snapToGrid;
                    this.showGridToggle();
                }
            }
        });
    }

    showGridToggle() {
        const message = this.snapToGrid ? 'Griglia magnetica attivata' : 'Griglia magnetica disattivata';
        this.showToast(message);
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all transform translate-x-full';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all transform translate-x-full';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 10);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize drag and drop
document.addEventListener('DOMContentLoaded', () => {
    window.dragDropManager = new DragDropManager();
});

// Handle state restoration
document.addEventListener('stateRestore', (e) => {
    const { state } = e.detail;
    
    if (state.type === 'table_move') {
        const tableElement = document.querySelector(`[data-table-id="${state.tableId}"]`);
        if (tableElement) {
            tableElement.style.left = `${state.oldPosition.x}px`;
            tableElement.style.top = `${state.oldPosition.y}px`;
        }
    }
});