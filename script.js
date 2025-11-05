import { ClothSimulation } from './clothSimulation.js';

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.clothSimulation = null;
        
        // Camera and rotation state
        this.camera = {
            distance: -600,
            rotationX: -Math.PI / 6,
            rotationY: Math.PI / 4,
            targetRotationX: -Math.PI / 6,
            targetRotationY: Math.PI / 4
        };
        
        this.autoRotate = true;
        this.rotationSpeed = 1.0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.setupEventListeners();
        this.setupBrightnessControl();
        this.setupGravityControl();
        this.init();
        this.animate();
        
        // Stats elements
        this.vertexCountElement = document.getElementById('vertexCount');
        this.triangleCountElement = document.getElementById('triangleCount');
        this.fpsElement = document.getElementById('fps');
        this.viewModeElement = document.getElementById('viewMode');
        this.lastTime = performance.now();
        this.frameCount = 0;
    }
    
    setupEventListeners() {
        // Mouse controls
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        
        // UI controls
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.autoRotate = e.target.checked;
        });
        
        document.getElementById('rotationSpeed').addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
        });
        
        document.getElementById('cameraDistance').addEventListener('input', (e) => {
            this.camera.distance = parseFloat(e.target.value);
        });
        
        document.getElementById('resetView').addEventListener('click', () => {
            this.resetCamera();
        });
    }
    
    setupGravityControl() {
        // Create gravity control
        const gravityContainer = document.createElement('div');
        gravityContainer.style.marginBottom = '10px';
        
        const gravityLabel = document.createElement('label');
        gravityLabel.innerHTML = 'Gravity: ';
        gravityLabel.style.fontSize = '0.8em';
        gravityLabel.style.cursor = 'pointer';
        
        const gravityCheckbox = document.createElement('input');
        gravityCheckbox.type = 'checkbox';
        gravityCheckbox.id = 'gravity';
        gravityCheckbox.checked = true;
        gravityCheckbox.style.marginRight = '8px';
        
        const gravityValue = document.createElement('span');
        gravityValue.id = 'gravityValue';
        gravityValue.textContent = 'ON';
        gravityValue.style.color = '#64ffda';
        gravityValue.style.marginLeft = '5px';
        gravityValue.style.fontWeight = 'bold';
        
        gravityLabel.appendChild(gravityCheckbox);
        gravityLabel.appendChild(document.createTextNode('Enabled'));
        gravityLabel.appendChild(gravityValue);
        gravityContainer.appendChild(gravityLabel);
        
        // Add to controls section at the top
        const controls = document.querySelector('.controls');
        controls.insertBefore(gravityContainer, controls.firstChild);
        
        // Add event listener
        gravityCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            gravityValue.textContent = enabled ? 'ON' : 'OFF';
            if (this.clothSimulation) {
                this.clothSimulation.gravity = enabled ? 0.5 : 0;
            }
        });
    }
    
    setupBrightnessControl() {
        // Create brightness control elements
        const brightnessContainer = document.createElement('div');
        brightnessContainer.style.marginBottom = '10px';
        
        const brightnessLabel = document.createElement('label');
        brightnessLabel.innerHTML = 'Brightness: ';
        brightnessLabel.style.fontSize = '0.8em';
        brightnessLabel.style.cursor = 'pointer';
        
        const brightnessSlider = document.createElement('input');
        brightnessSlider.type = 'range';
        brightnessSlider.id = 'brightness';
        brightnessSlider.min = '0.5';
        brightnessSlider.max = '2.0';
        brightnessSlider.step = '0.1';
        brightnessSlider.value = '1.2';
        brightnessSlider.style.width = '100%';
        brightnessSlider.style.margin = '5px 0';
        
        const brightnessValue = document.createElement('span');
        brightnessValue.id = 'brightnessValue';
        brightnessValue.textContent = '1.2';
        brightnessValue.style.color = '#64ffda';
        brightnessValue.style.marginLeft = '5px';
        brightnessValue.style.fontWeight = 'bold';
        
        brightnessLabel.appendChild(brightnessValue);
        brightnessContainer.appendChild(brightnessLabel);
        brightnessContainer.appendChild(brightnessSlider);
        
        // Add to controls section
        const controls = document.querySelector('.controls');
        controls.insertBefore(brightnessContainer, controls.querySelector('button'));
        
        // Add event listener
        brightnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            brightnessValue.textContent = value.toFixed(1);
            if (this.clothSimulation) {
                this.clothSimulation.brightness = value;
            }
        });
        
        // Create contrast control
        const contrastContainer = document.createElement('div');
        contrastContainer.style.marginBottom = '10px';
        
        const contrastLabel = document.createElement('label');
        contrastLabel.innerHTML = 'Contrast: ';
        contrastLabel.style.fontSize = '0.8em';
        contrastLabel.style.cursor = 'pointer';
        
        const contrastSlider = document.createElement('input');
        contrastSlider.type = 'range';
        contrastSlider.id = 'contrast';
        contrastSlider.min = '0.8';
        contrastSlider.max = '2.0';
        contrastSlider.step = '0.1';
        contrastSlider.value = '1.3';
        contrastSlider.style.width = '100%';
        contrastSlider.style.margin = '5px 0';
        
        const contrastValue = document.createElement('span');
        contrastValue.id = 'contrastValue';
        contrastValue.textContent = '1.3';
        contrastValue.style.color = '#64ffda';
        contrastValue.style.marginLeft = '5px';
        contrastValue.style.fontWeight = 'bold';
        
        contrastLabel.appendChild(contrastValue);
        contrastContainer.appendChild(contrastLabel);
        contrastContainer.appendChild(contrastSlider);
        
        controls.insertBefore(contrastContainer, controls.querySelector('button'));
        
        contrastSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            contrastValue.textContent = value.toFixed(1);
            if (this.clothSimulation) {
                this.clothSimulation.contrast = value;
            }
        });
        
        // Create oscillation controls
        const oscillationContainer = document.createElement('div');
        oscillationContainer.style.marginBottom = '10px';
        oscillationContainer.style.paddingBottom = '10px';
        oscillationContainer.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        
        const oscillationLabel = document.createElement('div');
        oscillationLabel.textContent = 'Oscillation:';
        oscillationLabel.style.fontSize = '0.9em';
        oscillationLabel.style.marginBottom = '5px';
        oscillationLabel.style.color = '#64ffda';
        
        const amplitudeContainer = document.createElement('div');
        amplitudeContainer.style.marginBottom = '5px';
        
        const amplitudeLabel = document.createElement('label');
        amplitudeLabel.innerHTML = 'Amplitude: ';
        amplitudeLabel.style.fontSize = '0.8em';
        
        const amplitudeSlider = document.createElement('input');
        amplitudeSlider.type = 'range';
        amplitudeSlider.id = 'amplitude';
        amplitudeSlider.min = '10';
        amplitudeSlider.max = '100';
        amplitudeSlider.step = '5';
        amplitudeSlider.value = '50';
        amplitudeSlider.style.width = '100%';
        
        const amplitudeValue = document.createElement('span');
        amplitudeValue.id = 'amplitudeValue';
        amplitudeValue.textContent = '50';
        amplitudeValue.style.color = '#64ffda';
        amplitudeValue.style.marginLeft = '5px';
        amplitudeValue.style.fontWeight = 'bold';
        
        amplitudeLabel.appendChild(amplitudeValue);
        amplitudeContainer.appendChild(amplitudeLabel);
        amplitudeContainer.appendChild(amplitudeSlider);
        
        const speedContainer = document.createElement('div');
        
        const speedLabel = document.createElement('label');
        speedLabel.innerHTML = 'Speed: ';
        speedLabel.style.fontSize = '0.8em';
        
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.id = 'speed';
        speedSlider.min = '0.5';
        speedSlider.max = '5';
        speedSlider.step = '0.1';
        speedSlider.value = '2';
        speedSlider.style.width = '100%';
        
        const speedValue = document.createElement('span');
        speedValue.id = 'speedValue';
        speedValue.textContent = '2.0';
        speedValue.style.color = '#64ffda';
        speedValue.style.marginLeft = '5px';
        speedValue.style.fontWeight = 'bold';
        
        speedLabel.appendChild(speedValue);
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        
        oscillationContainer.appendChild(oscillationLabel);
        oscillationContainer.appendChild(amplitudeContainer);
        oscillationContainer.appendChild(speedContainer);
        
        controls.insertBefore(oscillationContainer, controls.querySelector('button'));
        
        // Add event listeners for oscillation controls
        amplitudeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            amplitudeValue.textContent = value;
            if (this.clothSimulation) {
                this.clothSimulation.oscillationAmplitude = value;
            }
        });
        
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = value.toFixed(1);
            if (this.clothSimulation) {
                this.clothSimulation.oscillationSpeed = value;
            }
        });
    }
    
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        this.camera.targetRotationY += deltaX * 0.01;
        this.camera.targetRotationX += deltaY * 0.01;
        
        // Clamp vertical rotation
        this.camera.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.targetRotationX));
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }
    
    onMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onWheel(e) {
        e.preventDefault();
        this.camera.distance += e.deltaY * 0.5;
        this.camera.distance = Math.max(300, Math.min(1000, this.camera.distance));
        document.getElementById('cameraDistance').value = this.camera.distance;
    }
    
    resetCamera() {
        this.camera.distance = 600;
        this.camera.targetRotationX = -Math.PI / 6;
        this.camera.targetRotationY = Math.PI / 4;
        document.getElementById('cameraDistance').value = this.camera.distance;
        this.viewModeElement.textContent = "3D Perspective";
        this.autoRotate = true;
        document.getElementById('autoRotate').checked = true;
        
        // Reset brightness and contrast
        document.getElementById('brightness').value = '1.2';
        document.getElementById('brightnessValue').textContent = '1.2';
        document.getElementById('contrast').value = '1.3';
        document.getElementById('contrastValue').textContent = '1.3';
        
        // Reset oscillation controls
        document.getElementById('amplitude').value = '50';
        document.getElementById('amplitudeValue').textContent = '50';
        document.getElementById('speed').value = '2';
        document.getElementById('speedValue').textContent = '2.0';
        
        // Reset gravity
        document.getElementById('gravity').checked = true;
        document.getElementById('gravityValue').textContent = 'ON';
        
        if (this.clothSimulation) {
            this.clothSimulation.brightness = 1.2;
            this.clothSimulation.contrast = 1.3;
            this.clothSimulation.oscillationAmplitude = 50;
            this.clothSimulation.oscillationSpeed = 2;
            this.clothSimulation.gravity = 0.5;
        }
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.clothSimulation) {
            this.clothSimulation.resize(this.canvas.width, this.canvas.height);
        }
    }
    
    init() {
        this.clothSimulation = new ClothSimulation(this.canvas.width, this.canvas.height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Smooth camera rotation
        this.camera.rotationX += (this.camera.targetRotationX - this.camera.rotationX) * 0.1;
        this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;
        
        // Auto rotation
        if (this.autoRotate && !this.isDragging) {
            this.camera.targetRotationY += 0.01 * this.rotationSpeed;
        }
        
        // Clear canvas with enhanced background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle background pattern
        this.drawBackgroundPattern();
        
        // Update simulation
        this.clothSimulation.update();
        
        // Render cloth with 3D projection
        this.clothSimulation.render3D(this.ctx, this.camera);
        
        // Update stats
        this.updateStats();
    }
    
    drawBackgroundPattern() {
        // Draw a subtle grid or pattern in the background
        this.ctx.save();
        this.ctx.globalAlpha = 0.03;
        this.ctx.strokeStyle = '#64ffda';
        this.ctx.lineWidth = 0.5;
        
        const gridSize = 50;
        const offsetX = (this.camera.rotationY * 10) % gridSize;
        const offsetY = (this.camera.rotationX * 10) % gridSize;
        
        // Vertical lines
        for (let x = -offsetX; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = -offsetY; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    updateStats() {
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;
        
        if (elapsed >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            this.fpsElement.textContent = fps;
            this.vertexCountElement.textContent = this.clothSimulation.vertices.length;
            this.triangleCountElement.textContent = this.clothSimulation.triangles.length;
            
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }
}

// Error handling and initialization
window.addEventListener('load', () => {
    try {
        new App();
        console.log('Cloth Simulation started successfully!');
    } catch (error) {
        console.error('Failed to initialize cloth simulation:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = 'rgba(255, 0, 0, 0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '1000';
        errorDiv.innerHTML = `
            <h3>Error Loading Simulation</h3>
            <p>${error.message}</p>
            <p>Please check the console for details.</p>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - simulation may slow down');
    } else {
        console.log('Page visible - resuming normal simulation');
    }
});

// Export for potential module usage
export { App };