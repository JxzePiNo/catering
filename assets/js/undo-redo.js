class UndoRedoManager {
    constructor(maxStates = 50) {
        this.states = [];
        this.currentIndex = -1;
        this.maxStates = maxStates;
        this.sessionId = this.generateSessionId();
        this.initEventListeners();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveState(description, data) {
        // Remove future states if we're not at the end
        this.states = this.states.slice(0, this.currentIndex + 1);
        
        // Create new state
        const state = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            description: description,
            data: JSON.parse(JSON.stringify(data)) // Deep clone
        };
        
        this.states.push(state);
        this.currentIndex++;
        
        // Keep only maxStates
        if (this.states.length > this.maxStates) {
            this.states.shift();
            this.currentIndex--;
        }
        
        this.updateUI();
        this.saveToServer(state);
    }

    undo() {
        if (!this.canUndo()) return null;
        
        this.currentIndex--;
        const state = this.states[this.currentIndex];
        this.updateUI();
        return state;
    }

    redo() {
        if (!this.canRedo()) return null;
        
        this.currentIndex++;
        const state = this.states[this.currentIndex];
        this.updateUI();
        return state;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.states.length - 1;
    }

    updateUI() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.title = this.canUndo() ? 
                `Annulla: ${this.states[this.currentIndex - 1]?.description}` : 
                'Nessuna azione da annullare';
        }
        
        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.title = this.canRedo() ? 
                `Ripeti: ${this.states[this.currentIndex + 1]?.description}` : 
                'Nessuna azione da ripetere';
        }
    }

    async saveToServer(state) {
        try {
            await fetch('api/states.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    description: state.description,
                    state_data: state.data
                })
            });
        } catch (error) {
            console.warn('Failed to save state to server:', error);
        }
    }

    initEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.handleUndo();
            } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.handleRedo();
            }
        });

        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#undo-btn')) {
                this.handleUndo();
            } else if (e.target.closest('#redo-btn')) {
                this.handleRedo();
            }
        });
    }

    handleUndo() {
        const state = this.undo();
        if (state) {
            this.restoreState(state);
        }
    }

    handleRedo() {
        const state = this.redo();
        if (state) {
            this.restoreState(state);
        }
    }

    restoreState(state) {
        // Emit custom event for other components to handle
        document.dispatchEvent(new CustomEvent('stateRestore', {
            detail: { state: state.data, description: state.description }
        }));
    }
}

// Initialize global undo/redo manager
window.undoManager = new UndoRedoManager();