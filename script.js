import { ClothSimulation } from './clothSimulation.js';
import { WebGPURenderer } from './webgpu-renderer.js';

class App {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.clothSimulation = null;
        this.webgpuRenderer = null;
        
        // Изначальные параметры камеры
        this.camera = {
            distance: 600,
            rotationX: -Math.PI / 4,
            rotationY: Math.PI / 4,
            targetRotationX: -Math.PI / 4,
            targetRotationY: Math.PI / 4
        };
        
        this.autoRotate = true;
        this.rotationSpeed = 0.5;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastTime = performance.now();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Инициализация WebGPU и симуляции
        this.init();
        
        // Элементы статистики
        this.vertexCountElement = document.getElementById('vertexCount');
        this.triangleCountElement = document.getElementById('triangleCount');
        this.fpsElement = document.getElementById('fps');
        this.viewModeElement = document.getElementById('viewMode');
        this.frameCount = 0;
        this.statsTime = this.lastTime;
    }

    async init() {
        try {
            // Инициализация WebGPU рендерера
            this.webgpuRenderer = new WebGPURenderer(this.canvas);
            await this.webgpuRenderer.init();

            // Инициализация симуляции
            this.clothSimulation = new ClothSimulation();

            // Настройка UI
            this.setupControls();

            // Запуск анимации
            this.animate();

        } catch (error) {
            console.error('Failed to initialize WebGPU:', error);
            this.showError('WebGPU initialization failed: ' + error.message);
        }
    }

    setupControls() {
        this.setupEventListeners();
        this.setupPBDControls();
        this.setupOscillationControls();
        this.setupLightingControls();
    }

    setupPBDControls() {
        const pbdControlsContainer = document.getElementById('pbdControls');
        pbdControlsContainer.innerHTML = '';

        // PBD Stiffness
        const stiffnessContainer = document.createElement('div');
        stiffnessContainer.className = 'control-group';

        const stiffnessLabel = document.createElement('label');
        stiffnessLabel.innerHTML = 'PBD Stiffness: ';
        stiffnessLabel.style.fontSize = '0.8em';

        const stiffnessSlider = document.createElement('input');
        stiffnessSlider.type = 'range';
        stiffnessSlider.id = 'pbdStiffness';
        stiffnessSlider.min = '0.1';
        stiffnessSlider.max = '1.0';
        stiffnessSlider.step = '0.05';
        stiffnessSlider.value = '0.9';
        stiffnessSlider.style.width = '100%';
        stiffnessSlider.style.margin = '5px 0';

        const stiffnessValue = document.createElement('span');
        stiffnessValue.id = 'pbdStiffnessValue';
        stiffnessValue.textContent = '0.9';
        stiffnessValue.style.color = '#64ffda';
        stiffnessValue.style.fontWeight = 'bold';
        stiffnessValue.style.marginLeft = '5px';

        stiffnessLabel.appendChild(stiffnessValue);
        stiffnessContainer.appendChild(stiffnessLabel);
        stiffnessContainer.appendChild(stiffnessSlider);

        // PBD Iterations
        const iterationsContainer = document.createElement('div');
        iterationsContainer.className = 'control-group';

        const iterationsLabel = document.createElement('label');
        iterationsLabel.innerHTML = 'PBD Iterations: ';
        iterationsLabel.style.fontSize = '0.8em';

        const iterationsSlider = document.createElement('input');
        iterationsSlider.type = 'range';
        iterationsSlider.id = 'pbdIterations';
        iterationsSlider.min = '1';
        iterationsSlider.max = '20';
        iterationsSlider.step = '1';
        iterationsSlider.value = '5';
        iterationsSlider.style.width = '100%';
        iterationsSlider.style.margin = '5px 0';

        const iterationsValue = document.createElement('span');
        iterationsValue.id = 'pbdIterationsValue';
        iterationsValue.textContent = '5';
        iterationsValue.style.color = '#64ffda';
        iterationsValue.style.fontWeight = 'bold';
        iterationsValue.style.marginLeft = '5px';

        iterationsLabel.appendChild(iterationsValue);
        iterationsContainer.appendChild(iterationsLabel);
        iterationsContainer.appendChild(iterationsSlider);

        pbdControlsContainer.appendChild(stiffnessContainer);
        pbdControlsContainer.appendChild(iterationsContainer);

        // Обработчики событий
        stiffnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            stiffnessValue.textContent = value.toFixed(2);
            if (this.clothSimulation) {
                this.clothSimulation.stiffness = value;
            }
        });
        iterationsSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            iterationsValue.textContent = value;
            if (this.clothSimulation) {
                this.clothSimulation.iterations = value;
            }
        });
    }

    setupOscillationControls() {
        const oscillationControls = document.getElementById('oscillationControls');
        oscillationControls.innerHTML = '';

        // Амплитуда
        const amplitudeContainer = document.createElement('div');
        amplitudeContainer.className = 'control-group';

        const amplitudeLabel = document.createElement('label');
        amplitudeLabel.innerHTML = 'Oscillation Amplitude: ';
        amplitudeLabel.style.fontSize = '0.8em';

        const amplitudeSlider = document.createElement('input');
        amplitudeSlider.type = 'range';
        amplitudeSlider.id = 'oscillationAmplitude';
        amplitudeSlider.min = '10';
        amplitudeSlider.max = '100';
        amplitudeSlider.step = '5';
        amplitudeSlider.value = '40';
        amplitudeSlider.style.width = '100%';
        amplitudeSlider.style.margin = '5px 0';

        const amplitudeValue = document.createElement('span');
        amplitudeValue.id = 'oscillationAmplitudeValue';
        amplitudeValue.textContent = '40';
        amplitudeValue.style.color = '#64ffda';
        amplitudeValue.style.fontWeight = 'bold';
        amplitudeValue.style.marginLeft = '5px';

        amplitudeLabel.appendChild(amplitudeValue);
        amplitudeContainer.appendChild(amplitudeLabel);
        amplitudeContainer.appendChild(amplitudeSlider);

        // Скорость
        const speedContainer = document.createElement('div');
        speedContainer.className = 'control-group';

        const speedLabel = document.createElement('label');
        speedLabel.innerHTML = 'Oscillation Speed: ';
        speedLabel.style.fontSize = '0.8em';

        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.id = 'oscillationSpeed';
        speedSlider.min = '0.5';
        speedSlider.max = '5.0';
        speedSlider.step = '0.1';
        speedSlider.value = '2.0';
        speedSlider.style.width = '100%';
        speedSlider.style.margin = '5px 0';

        const speedValue = document.createElement('span');
        speedValue.id = 'oscillationSpeedValue';
        speedValue.textContent = '2.0';
        speedValue.style.color = '#64ffda';
        speedValue.style.fontWeight = 'bold';
        speedValue.style.marginLeft = '5px';

        speedLabel.appendChild(speedValue);
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);

        oscillationControls.appendChild(amplitudeContainer);
        oscillationControls.appendChild(speedContainer);

        // Обработчики
        amplitudeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            amplitudeValue.textContent = value;
            if (this.clothSimulation) {
                this.clothSimulation.setOscillationAmplitude(value);
            }
        });
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = value.toFixed(1);
            if (this.clothSimulation) {
                this.clothSimulation.setOscillationSpeed(value);
            }
        });
    }

    setupLightingControls() {
        const lightingControls = document.getElementById('lightingControls');
        lightingControls.innerHTML = '';

        // Свет направления X
        const lightXContainer = document.createElement('div');
        lightXContainer.className = 'control-group';

        const lightXLabel = document.createElement('label');
        lightXLabel.innerHTML = 'Light Direction X: ';
        lightXLabel.style.fontSize = '0.8em';

        const lightXSlider = document.createElement('input');
        lightXSlider.type = 'range';
        lightXSlider.id = 'lightDirectionX';
        lightXSlider.min = '-1.0';
        lightXSlider.max = '1.0';
        lightXSlider.step = '0.1';
        lightXSlider.value = '0.7';
        lightXSlider.style.width = '100%';
        lightXSlider.style.margin = '5px 0';

        const lightXValue = document.createElement('span');
        lightXValue.id = 'lightDirectionXValue';
        lightXValue.textContent = '0.7';
        lightXValue.style.color = '#64ffda';
        lightXValue.style.fontWeight = 'bold';
        lightXValue.style.marginLeft = '5px';

        lightXLabel.appendChild(lightXValue);
        lightXContainer.appendChild(lightXLabel);
        lightXContainer.appendChild(lightXSlider);

        // Свет направления Y
        const lightYContainer = document.createElement('div');
        lightYContainer.className = 'control-group';

        const lightYLabel = document.createElement('label');
        lightYLabel.innerHTML = 'Light Direction Y: ';
        lightYLabel.style.fontSize = '0.8em';

        const lightYSlider = document.createElement('input');
        lightYSlider.type = 'range';
        lightYSlider.id = 'lightDirectionY';
        lightYSlider.min = '-1.0';
        lightYSlider.max = '1.0';
        lightYSlider.step = '0.1';
        lightYSlider.value = '0.7';
        lightYSlider.style.width = '100%';
        lightYSlider.style.margin = '5px 0';

        const lightYValue = document.createElement('span');
        lightYValue.id = 'lightDirectionYValue';
        lightYValue.textContent = '0.7';
        lightYValue.style.color = '#64ffda';
        lightYValue.style.fontWeight = 'bold';
        lightYValue.style.marginLeft = '5px';

        lightYLabel.appendChild(lightYValue);
        lightYContainer.appendChild(lightYLabel);
        lightYContainer.appendChild(lightYSlider);

        // Свет направления Z
        const lightZContainer = document.createElement('div');
        lightZContainer.className = 'control-group';

        const lightZLabel = document.createElement('label');
        lightZLabel.innerHTML = 'Light Direction Z: ';
        lightZLabel.style.fontSize = '0.8em';

        const lightZSlider = document.createElement('input');
        lightZSlider.type = 'range';
        lightZSlider.id = 'lightDirectionZ';
        lightZSlider.min = '-1.0';
        lightZSlider.max = '1.0';
        lightZSlider.step = '0.1';
        lightZSlider.value = '0.2';
        lightZSlider.style.width = '100%';
        lightZSlider.style.margin = '5px 0';

        const lightZValue = document.createElement('span');
        lightZValue.id = 'lightDirectionZValue';
        lightZValue.textContent = '0.2';
        lightZValue.style.color = '#64ffda';
        lightZValue.style.fontWeight = 'bold';
        lightZValue.style.marginLeft = '5px';

        lightZLabel.appendChild(lightZValue);
        lightZContainer.appendChild(lightZLabel);
        lightZContainer.appendChild(lightZSlider);

        // Амбиентное освещение
        const ambientContainer = document.createElement('div');
        ambientContainer.className = 'control-group';

        const ambientLabel = document.createElement('label');
        ambientLabel.innerHTML = 'Ambient Light: ';
        ambientLabel.style.fontSize = '0.8em';

        const ambientSlider = document.createElement('input');
        ambientSlider.type = 'range';
        ambientSlider.id = 'ambientLight';
        ambientSlider.min = '0.0';
        ambientSlider.max = '1.0';
        ambientSlider.step = '0.05';
        ambientSlider.value = '0.3';
        ambientSlider.style.width = '100%';
        ambientSlider.style.margin = '5px 0';

        const ambientValue = document.createElement('span');
        ambientValue.id = 'ambientLightValue';
        ambientValue.textContent = '0.3';
        ambientValue.style.color = '#64ffda';
        ambientValue.style.fontWeight = 'bold';
        ambientValue.style.marginLeft = '5px';

        ambientLabel.appendChild(ambientValue);
        ambientContainer.appendChild(ambientLabel);
        ambientContainer.appendChild(ambientSlider);

        // Добавляем в контейнер
        lightingControls.appendChild(lightXContainer);
        lightingControls.appendChild(lightYContainer);
        lightingControls.appendChild(lightZContainer);
        lightingControls.appendChild(ambientContainer);

        // Обработчики
        document.getElementById('lightDirectionX').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('lightDirectionXValue').textContent = val.toFixed(1);
            this.updateLightDirection();
        });
        document.getElementById('lightDirectionY').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('lightDirectionYValue').textContent = val.toFixed(1);
            this.updateLightDirection();
        });
        document.getElementById('lightDirectionZ').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('lightDirectionZValue').textContent = val.toFixed(1);
            this.updateLightDirection();
        });
        document.getElementById('ambientLight').addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('ambientLightValue').textContent = val.toFixed(2);
            if (this.webgpuRenderer) {
                this.webgpuRenderer.setAmbientLight(val);
            }
        });
    }

    updateLightDirection() {
        if (!this.webgpuRenderer) return;
        const x = parseFloat(document.getElementById('lightDirectionX').value);
        const y = parseFloat(document.getElementById('lightDirectionY').value);
        const z = parseFloat(document.getElementById('lightDirectionZ').value);
        this.webgpuRenderer.setLightDirection(x, y, z);
    }

    setupEventListeners() {
        // Мышь управление
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        // UI управление
        const autoRotateCheckbox = document.getElementById('autoRotate');
        if (autoRotateCheckbox) {
            autoRotateCheckbox.addEventListener('change', (e) => {
                this.autoRotate = e.target.checked;
            });
        }

        const rotationSpeedSlider = document.getElementById('rotationSpeed');
        if (rotationSpeedSlider) {
            rotationSpeedSlider.addEventListener('input', (e) => {
                this.rotationSpeed = parseFloat(e.target.value);
            });
        }

        const cameraDistanceSlider = document.getElementById('cameraDistance');
        if (cameraDistanceSlider) {
            cameraDistanceSlider.addEventListener('input', (e) => {
                this.camera.distance = parseFloat(e.target.value);
            });
        }

        const resetButton = document.getElementById('resetView');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetCamera());
        }

        const gravityCheckbox = document.getElementById('gravity');
        if (gravityCheckbox) {
            gravityCheckbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                const gravityValue = document.getElementById('gravityValue');
                if (gravityValue) {
                    gravityValue.textContent = enabled ? 'ON' : 'OFF';
                }
                if (this.clothSimulation) {
                    this.clothSimulation.gravity = enabled ? 0.5 : 0;
                }
            });
        }
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
        this.camera.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.targetRotationX));
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
        const cameraDistanceSlider = document.getElementById('cameraDistance');
        if (cameraDistanceSlider) {
            cameraDistanceSlider.value = this.camera.distance;
        }
    }

    resetCamera() {
        this.camera.distance = 600;
        this.camera.targetRotationX = -Math.PI/4;
        this.camera.targetRotationY = Math.PI/4;

        const cameraDistanceSlider = document.getElementById('cameraDistance');
        if (cameraDistanceSlider) {
            cameraDistanceSlider.value = this.camera.distance;
        }

        const autoRotateCheckbox = document.getElementById('autoRotate');
        if (autoRotateCheckbox) {
            autoRotateCheckbox.checked = true;
        }
        this.autoRotate = true;

        if (this.viewModeElement) {
            this.viewModeElement.textContent = "Isometric View";
        }

        // Сброс параметров PBD
        const stiffnessSlider = document.getElementById('pbdStiffness');
        const stiffnessValue = document.getElementById('pbdStiffnessValue');
        if (stiffnessSlider && stiffnessValue) {
            stiffnessSlider.value = '0.9';
            stiffnessValue.textContent = '0.9';
        }
        const iterationsSlider = document.getElementById('pbdIterations');
        const iterationsValue = document.getElementById('pbdIterationsValue');
        if (iterationsSlider && iterationsValue) {
            iterationsSlider.value = '5';
            iterationsValue.textContent = '5';
        }

        // Сброс параметров колебаний
        const amplitudeSlider = document.getElementById('oscillationAmplitude');
        const amplitudeValue = document.getElementById('oscillationAmplitudeValue');
        if (amplitudeSlider && amplitudeValue) {
            amplitudeSlider.value = '40';
            amplitudeValue.textContent = '40';
        }
        const speedSlider = document.getElementById('oscillationSpeed');
        const speedValue = document.getElementById('oscillationSpeedValue');
        if (speedSlider && speedValue) {
            speedSlider.value = '2.0';
            speedValue.textContent = '2.0';
        }

        // Сброс освещения
        const lightXSlider = document.getElementById('lightDirectionX');
        const lightXValue = document.getElementById('lightDirectionXValue');
        if (lightXSlider && lightXValue) {
            lightXSlider.value = '0.7';
            lightXValue.textContent = '0.7';
        }
        const lightYSlider = document.getElementById('lightDirectionY');
        const lightYValue = document.getElementById('lightDirectionYValue');
        if (lightYSlider && lightYValue) {
            lightYSlider.value = '0.7';
            lightYValue.textContent = '0.7';
        }
        const lightZSlider = document.getElementById('lightDirectionZ');
        const lightZValue = document.getElementById('lightDirectionZValue');
        if (lightZSlider && lightZValue) {
            lightZSlider.value = '0.2';
            lightZValue.textContent = '0.2';
        }
        const ambientSlider = document.getElementById('ambientLight');
        const ambientValue = document.getElementById('ambientLightValue');
        if (ambientSlider && ambientValue) {
            ambientSlider.value = '0.3';
            ambientValue.textContent = '0.3';
        }
        // Гравитация
        const gravityCheckbox = document.getElementById('gravity');
        const gravityValue = document.getElementById('gravityValue');
        if (gravityCheckbox && gravityValue) {
            gravityCheckbox.checked = true;
            gravityValue.textContent = 'ON';
        }

        // Обновляем симуляцию
        if (this.clothSimulation) {
            this.clothSimulation.stiffness = 0.9;
            this.clothSimulation.iterations = 5;
            this.clothSimulation.gravity = 0.5;
            this.clothSimulation.setOscillationAmplitude(40);
            this.clothSimulation.setOscillationSpeed(2);
        }

        // Обновляем рендерер
        if (this.webgpuRenderer) {
            this.webgpuRenderer.setLightDirection(0.7, 0.7, 0.2);
            this.webgpuRenderer.setAmbientLight(0.3);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.webgpuRenderer) {
            this.webgpuRenderer.resize(this.canvas.width, this.canvas.height);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // Интерполяция вращения камеры
        this.camera.rotationX += (this.camera.targetRotationX - this.camera.rotationX) * 0.1;
        this.camera.rotationY += (this.camera.targetRotationY - this.camera.rotationY) * 0.1;

        // Автоматическая ротация
        if (this.autoRotate && !this.isDragging) {
            this.camera.targetRotationY += 0.005 * this.rotationSpeed;
        }

        // Обновление симуляции и рендер
        if (this.clothSimulation && this.webgpuRenderer) {
            this.clothSimulation.update(deltaTime);
            this.webgpuRenderer.updateVertexBuffer(this.clothSimulation.vertices);
            this.webgpuRenderer.updateCamera(
                this.camera.rotationX,
                this.camera.rotationY,
                this.camera.distance
            );
            this.webgpuRenderer.render();
        }

        // Обновление статистики
        this.updateStats(currentTime);
    }

    updateStats(currentTime) {
        this.frameCount++;
        const elapsed = currentTime - this.statsTime;
        if (elapsed >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            if (this.fpsElement) this.fpsElement.textContent = fps;
            if (this.vertexCountElement && this.clothSimulation) {
                this.vertexCountElement.textContent = this.clothSimulation.vertices.length;
            }
            if (this.triangleCountElement && this.clothSimulation) {
                this.triangleCountElement.textContent = this.clothSimulation.triangles.length;
            }
            this.frameCount = 0;
            this.statsTime = currentTime;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = 'rgba(255, 50, 50, 0.9)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '1000';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.innerHTML = `
            <h3>WebGPU Error</h3>
            <p>${message}</p>
            <p>Please check if your browser supports WebGPU.</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #333; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Инициализация
window.addEventListener('load', () => {
    new App();
});