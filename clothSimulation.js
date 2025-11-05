export class ClothSimulation {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        
        // Simulation parameters
        this.gravity = 0.5; // Можно менять
        this.damping = 0.99;
        this.springStrength = 0.5;
        this.springDamping = 0.9;
        
        // Cloth parameters
        this.segments = 10;
        this.clothSize = 400;
        this.restDistance = this.clothSize / this.segments;
        
        // Initialize cloth
        this.vertices = [];
        this.triangles = [];
        this.springs = [];
        
        this.initCloth();
        
        // Animation parameters
        this.time = 0;
        this.oscillationAmplitude = 50;
        this.oscillationSpeed = 2;
        
        // Visual parameters
        this.brightness = 1.2;
        this.contrast = 1.3;
    }
    
    initCloth() {
        this.createVertices();
        this.createSprings();
        this.createTriangles();
        this.fixCorners();
    }
    
    createVertices() {
        const halfSize = this.clothSize / 2;
        
        for (let y = 0; y <= this.segments; y++) {
            for (let x = 0; x <= this.segments; x++) {
                const vertex = {
                    x: (x / this.segments - 0.5) * this.clothSize,
                    y: 0,
                    z: (y / this.segments - 0.5) * this.clothSize,
                    oldX: (x / this.segments - 0.5) * this.clothSize,
                    oldY: 0,
                    oldZ: (y / this.segments - 0.5) * this.clothSize,
                    mass: 1,
                    fixed: false
                };
                
                this.vertices.push(vertex);
            }
        }
    }
    
    createSprings() {
        // Structural springs (edges)
        for (let y = 0; y <= this.segments; y++) {
            for (let x = 0; x <= this.segments; x++) {
                const index = y * (this.segments + 1) + x;
                
                // Horizontal springs
                if (x < this.segments) {
                    this.springs.push({
                        pointA: index,
                        pointB: index + 1,
                        restLength: this.restDistance
                    });
                }
                
                // Vertical springs
                if (y < this.segments) {
                    this.springs.push({
                        pointA: index,
                        pointB: index + this.segments + 1,
                        restLength: this.restDistance
                    });
                }
                
                // Diagonal springs (shear)
                if (x < this.segments && y < this.segments) {
                    // Top-left to bottom-right
                    this.springs.push({
                        pointA: index,
                        pointB: index + this.segments + 2,
                        restLength: Math.sqrt(2) * this.restDistance
                    });
                    
                    // Top-right to bottom-left
                    this.springs.push({
                        pointA: index + 1,
                        pointB: index + this.segments + 1,
                        restLength: Math.sqrt(2) * this.restDistance
                    });
                }
            }
        }
    }
    
    createTriangles() {
        for (let y = 0; y < this.segments; y++) {
            for (let x = 0; x < this.segments; x++) {
                const topLeft = y * (this.segments + 1) + x;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + this.segments + 1;
                const bottomRight = bottomLeft + 1;
                
                // Split square into two triangles
                // Triangle 1: top-left, top-right, bottom-left
                this.triangles.push([topLeft, topRight, bottomLeft]);
                
                // Triangle 2: top-right, bottom-right, bottom-left
                this.triangles.push([topRight, bottomRight, bottomLeft]);
            }
        }
    }
    
    fixCorners() {
        // Fix all four corners
        const corners = [
            0, // top-left
            this.segments, // top-right
            this.segments * (this.segments + 1), // bottom-left
            this.segments * (this.segments + 1) + this.segments // bottom-right
        ];
        
        corners.forEach(index => {
            this.vertices[index].fixed = true;
        });
    }
    
    update() {
        this.time += 0.016; // Assuming 60fps
        
        this.applyForces();
        this.updateVertices();
        this.satisfyConstraints();
        this.applyOscillation();
    }
    
    applyForces() {
        // Apply gravity and update positions using Verlet integration
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            
            if (!vertex.fixed) {
                // Save current position
                const tempX = vertex.x;
                const tempY = vertex.y;
                const tempZ = vertex.z;
                
                // Verlet integration with gravity
                vertex.x += (vertex.x - vertex.oldX) * this.damping;
                vertex.y += (vertex.y - vertex.oldY) * this.damping + this.gravity;
                vertex.z += (vertex.z - vertex.oldZ) * this.damping;
                
                // Update old position
                vertex.oldX = tempX;
                vertex.oldY = tempY;
                vertex.oldZ = tempZ;
            }
        }
    }
    
    updateVertices() {
        // Update spring constraints
        for (let i = 0; i < this.springs.length; i++) {
            const spring = this.springs[i];
            const pointA = this.vertices[spring.pointA];
            const pointB = this.vertices[spring.pointB];
            
            // Calculate current distance
            const dx = pointB.x - pointA.x;
            const dy = pointB.y - pointA.y;
            const dz = pointB.z - pointA.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance > 0) {
                // Calculate spring force
                const diff = (spring.restLength - distance) / distance;
                const forceX = dx * diff * this.springStrength;
                const forceY = dy * diff * this.springStrength;
                const forceZ = dz * diff * this.springStrength;
                
                // Apply force to points
                if (!pointA.fixed) {
                    pointA.x -= forceX * 0.5;
                    pointA.y -= forceY * 0.5;
                    pointA.z -= forceZ * 0.5;
                }
                
                if (!pointB.fixed) {
                    pointB.x += forceX * 0.5;
                    pointB.y += forceY * 0.5;
                    pointB.z += forceZ * 0.5;
                }
            }
        }
    }
    
    satisfyConstraints() {
        // Additional constraint satisfaction passes
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < this.springs.length; i++) {
                const spring = this.springs[i];
                const pointA = this.vertices[spring.pointA];
                const pointB = this.vertices[spring.pointB];
                
                const dx = pointB.x - pointA.x;
                const dy = pointB.y - pointA.y;
                const dz = pointB.z - pointA.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance > 0) {
                    const diff = (spring.restLength - distance) / distance;
                    const offsetX = dx * diff * 0.5;
                    const offsetY = dy * diff * 0.5;
                    const offsetZ = dz * diff * 0.5;
                    
                    if (!pointA.fixed) {
                        pointA.x -= offsetX;
                        pointA.y -= offsetY;
                        pointA.z -= offsetZ;
                    }
                    
                    if (!pointB.fixed) {
                        pointB.x += offsetX;
                        pointB.y += offsetY;
                        pointB.z += offsetZ;
                    }
                }
            }
        }
    }
    
    applyOscillation() {
        // Find center vertex
        const centerY = Math.floor(this.segments / 2);
        const centerX = Math.floor(this.segments / 2);
        const centerIndex = centerY * (this.segments + 1) + centerX;
        const centerVertex = this.vertices[centerIndex];
        
        // Apply sinusoidal oscillation to center vertex
        centerVertex.y = Math.sin(this.time * this.oscillationSpeed) * this.oscillationAmplitude;
        centerVertex.oldY = centerVertex.y; // Keep old position synchronized
    }
    
    render3D(ctx, camera) {
        ctx.save();
        
        // Center the cloth in the view
        ctx.translate(this.width / 2, this.height / 2);
        
        // Simple 3D projection
        const project = (x, y, z) => {
            // Rotate around Y axis
            const cosY = Math.cos(camera.rotationY);
            const sinY = Math.sin(camera.rotationY);
            let x1 = x * cosY - z * sinY;
            let z1 = x * sinY + z * cosY;
            
            // Rotate around X axis
            const cosX = Math.cos(camera.rotationX);
            const sinX = Math.sin(camera.rotationX);
            let y1 = y * cosX - z1 * sinX;
            z1 = y * sinX + z1 * cosX;
            
            // Perspective projection
            const scale = camera.distance / (camera.distance + z1);
            return {
                x: x1 * scale,
                y: y1 * scale
            };
        };
        
        this.renderTriangles3D(ctx, project);
        
        ctx.restore();
    }
    
    renderTriangles3D(ctx, project) {
        // Pre-project all vertices
        const projectedVertices = this.vertices.map(vertex => {
            return project(vertex.x, vertex.y, vertex.z);
        });
        
        // Sort triangles by depth for proper rendering
        const sortedTriangles = this.triangles.map((triangle, index) => {
            const v0 = this.vertices[triangle[0]];
            const v1 = this.vertices[triangle[1]];
            const v2 = this.vertices[triangle[2]];
            
            // Calculate average Z for depth sorting
            const avgZ = (v0.z + v1.z + v2.z) / 3;
            return { triangle, index, depth: avgZ };
        }).sort((a, b) => b.depth - a.depth);
        
        // Render triangles from back to front
        for (const { triangle } of sortedTriangles) {
            const p0 = projectedVertices[triangle[0]];
            const p1 = projectedVertices[triangle[1]];
            const p2 = projectedVertices[triangle[2]];
            
            // Calculate lighting based on normal
            const v0 = this.vertices[triangle[0]];
            const v1 = this.vertices[triangle[1]];
            const v2 = this.vertices[triangle[2]];
            
            const dx1 = v1.x - v0.x;
            const dy1 = v1.y - v0.y;
            const dz1 = v1.z - v0.z;
            
            const dx2 = v2.x - v0.x;
            const dy2 = v2.y - v0.y;
            const dz2 = v2.z - v0.z;
            
            // Cross product for normal
            const nx = dy1 * dz2 - dz1 * dy2;
            const ny = dz1 * dx2 - dx1 * dz2;
            const nz = dx1 * dy2 - dy1 * dx2;
            
            // Normalize and calculate dot product with light direction
            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            const lightX = 0.5;
            const lightY = 1;
            const lightZ = 0.3;
            const lightLength = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ);
            
            let intensity = 0.3; // Minimum brightness
            if (length > 0) {
                const dot = (nx * lightX + ny * lightY + nz * lightZ) / (length * lightLength);
                intensity = Math.max(0.3, Math.min(1.5, dot + 0.7)); // Enhanced brightness range
                intensity *= this.brightness; // Apply global brightness
            }
            
            // Enhanced color based on height and lighting
            const avgY = (v0.y + v1.y + v2.y) / 3;
            const heightIntensity = Math.max(0, Math.min(1, (avgY + 100) / 200));
            
            // More vibrant color palette
            const hue = 220 - heightIntensity * 140; // Blue to magenta to pink
            const saturation = 80 + heightIntensity * 20; // More saturation for higher areas
            const lightness = 50 * intensity * this.contrast;
            
            // Enhanced glow effect for depth
            const glow = Math.max(0, (1 - heightIntensity) * 0.3);
            
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`;
            ctx.strokeStyle = `hsla(${hue}, 90%, ${lightness * 1.2}%, 0.8)`;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${glow})`;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
        
        // Reset shadow for other elements
        ctx.shadowBlur = 0;
    }
    
    // Legacy methods kept for compatibility
    render(ctx) {
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(1, 1);
        ctx.rotate(Math.PI / 4);
        this.renderTriangles(ctx);
        ctx.restore();
    }
    
    renderTriangles(ctx) {
        for (let i = 0; i < this.triangles.length; i++) {
            const triangle = this.triangles[i];
            const v0 = this.vertices[triangle[0]];
            const v1 = this.vertices[triangle[1]];
            const v2 = this.vertices[triangle[2]];
            
            const avgY = (v0.y + v1.y + v2.y) / 3;
            const intensity = Math.max(0, Math.min(1, (avgY + 100) / 200));
            const hue = 220 - intensity * 140;
            const color = `hsla(${hue}, 85%, 65%, 0.8)`;
            
            ctx.fillStyle = color;
            ctx.strokeStyle = `hsla(${hue}, 95%, 75%, 0.9)`;
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            ctx.moveTo(v0.x, v0.z);
            ctx.lineTo(v1.x, v1.z);
            ctx.lineTo(v2.x, v2.z);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
}