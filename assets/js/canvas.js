class TableCanvas {
    constructor(container) {
        this.container = document.getElementById(container);
        this.canvas = document.getElementById('canvas');
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 2;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastPanPoint = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.setupPanning();
        this.setupZoom();
        this.setupKeyboardControls();
        this.setupResizeHandler();
    }

    setupPanning() {
        let isPanning = false;
        let lastPoint = { x: 0, y: 0 };

        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target === this.canvas) {
                isPanning = true;
                lastPoint = { x: e.clientX, y: e.clientY };
                this.container.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isPanning) return;

            const deltaX = e.clientX - lastPoint.x;
            const deltaY = e.clientY - lastPoint.y;

            this.panX += deltaX;
            this.panY += deltaY;

            this.updateTransform();

            lastPoint = { x: e.clientX, y: e.clientY };
        });

        document.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                this.container.style.cursor = 'move';
            }
        });

        // Touch support
        this.setupTouchPanning();
    }

    setupTouchPanning() {
        let lastTouchPoint = null;
        let isPanningTouch = false;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isPanningTouch = true;
                lastTouchPoint = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
                e.preventDefault();
            }
        }, { passive: false });

        this.container.addEventListener('touchmove', (e) => {
            if (isPanningTouch && e.touches.length === 1 && lastTouchPoint) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - lastTouchPoint.x;
                const deltaY = touch.clientY - lastTouchPoint.y;

                this.panX += deltaX;
                this.panY += deltaY;

                this.updateTransform();

                lastTouchPoint = {
                    x: touch.clientX,
                    y: touch.clientY
                };

                e.preventDefault();
            }
        }, { passive: false });

        this.container.addEventListener('touchend', () => {
            isPanningTouch = false;
            lastTouchPoint = null;
        });
    }

    setupZoom() {
        // Mouse wheel zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoomAt(mouseX, mouseY, delta);
        });

        // Zoom buttons
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.zoomToCenter(0.2);
        });

        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.zoomToCenter(-0.2);
        });

        document.getElementById('reset-view')?.addEventListener('click', () => {
            this.resetView();
        });
    }

    zoomAt(x, y, delta) {
        const oldZoom = this.zoom;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        
        if (newZoom === this.zoom) return;
        
        const zoomRatio = newZoom / oldZoom;
        
        // Adjust pan to zoom towards the mouse position
        this.panX = x - (x - this.panX) * zoomRatio;
        this.panY = y - (y - this.panY) * zoomRatio;
        this.zoom = newZoom;
        
        this.updateTransform();
        this.updateZoomUI();
    }

    zoomToCenter(delta) {
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomAt(centerX, centerY, delta);
    }

    resetView() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomUI();
    }

    updateTransform() {
        this.canvas.style.transform = 
            `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    updateZoomUI() {
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        }

        // Update button states
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) zoomInBtn.disabled = this.zoom >= this.maxZoom;
        if (zoomOutBtn) zoomOutBtn.disabled = this.zoom <= this.minZoom;
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key) {
                case '=':
                case '+':
                    e.preventDefault();
                    this.zoomToCenter(0.1);
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomToCenter(-0.1);
                    break;
                case '0':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.resetView();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.panY += 50;
                    this.updateTransform();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.panY -= 50;
                    this.updateTransform();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.panX += 50;
                    this.updateTransform();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.panX -= 50;
                    this.updateTransform();
                    break;
            }
        });
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            // Adjust canvas bounds if needed
            this.updateTransform();
        });
    }

    // Get canvas coordinates from screen coordinates
    screenToCanvas(screenX, screenY) {
        const rect = this.container.getBoundingClientRect();
        const x = (screenX - rect.left - this.panX) / this.zoom;
        const y = (screenY - rect.top - this.panY) / this.zoom;
        return { x, y };
    }

    // Get screen coordinates from canvas coordinates
    canvasToScreen(canvasX, canvasY) {
        const rect = this.container.getBoundingClientRect();
        const x = canvasX * this.zoom + this.panX + rect.left;
        const y = canvasY * this.zoom + this.panY + rect.top;
        return { x, y };
    }
}

// Initialize canvas when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('canvas-container')) {
        window.tableCanvas = new TableCanvas('canvas-container');
    }
});