export class ClothSimulation {
    constructor() {
        // PBD параметры
        this.gravity = 0.5;
        this.damping = 0.98;
        this.stiffness = 0.9;
        this.iterations = 5;

        // Размер ткани
        this.segments = 10;
        this.clothSize = 350;
        this.restDistance = this.clothSize / this.segments;

        this.vertices = [];
        this.triangles = [];
        this.constraints = [];
        this.invMass = [];

        this.initCloth();

        this.time = 0;
        this.oscillationAmplitude = 40;
        this.oscillationSpeed = 2;
    }

    initCloth() {
        this.createVertices();
        this.createConstraints();
        this.createTriangles();
        this.fixCorners();
    }

    createVertices() {
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
                    fixed: false,
                    normal: {x:0, y:1, z:0} // Инициализация нормали
                };
                this.vertices.push(vertex);
                this.invMass.push(1.0);
            }
        }
    }

    createConstraints() {
        for (let y = 0; y <= this.segments; y++) {
            for (let x = 0; x <= this.segments; x++) {
                const index = y * (this.segments + 1) + x;
                if (x < this.segments) {
                    this.constraints.push({
                        type: 'distance',
                        p1: index,
                        p2: index + 1,
                        restLength: this.restDistance,
                        stiffness: this.stiffness
                    });
                }
                if (y < this.segments) {
                    this.constraints.push({
                        type: 'distance',
                        p1: index,
                        p2: index + this.segments + 1,
                        restLength: this.restDistance,
                        stiffness: this.stiffness
                    });
                }
                if (x < this.segments && y < this.segments) {
                    this.constraints.push({
                        type: 'distance',
                        p1: index,
                        p2: index + this.segments + 2,
                        restLength: Math.sqrt(2) * this.restDistance,
                        stiffness: this.stiffness * 0.3
                    });
                    this.constraints.push({
                        type: 'distance',
                        p1: index + 1,
                        p2: index + this.segments + 1,
                        restLength: Math.sqrt(2) * this.restDistance,
                        stiffness: this.stiffness * 0.3
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
                this.triangles.push([topLeft, topRight, bottomLeft]);
                this.triangles.push([topRight, bottomRight, bottomLeft]);
            }
        }
    }

    fixCorners() {
        const corners = [
            0,
            this.segments,
            this.segments * (this.segments + 1),
            this.segments * (this.segments + 1) + this.segments
        ];
        corners.forEach(index => {
            this.vertices[index].fixed = true;
            this.invMass[index] = 0;
        });
    }

    update(dt = 0.016) {
        this.time += dt;
        this.predictPositions(dt);
        for (let iter = 0; iter < this.iterations; iter++) {
            this.solveConstraints();
        }
        this.updateVelocities(dt);
        this.applyOscillation();

        // Расчет нормалей
        this.calculateVertexNormals();
    }

    predictPositions(dt) {
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            if (!v.fixed && this.invMass[i] > 0) {
                const tempX = v.x;
                const tempY = v.y;
                const tempZ = v.z;
                v.x += (v.x - v.oldX) * this.damping;
                v.y += (v.y - v.oldY) * this.damping + this.gravity * dt * dt;
                v.z += (v.z - v.oldZ) * this.damping;
                v.oldX = tempX;
                v.oldY = tempY;
                v.oldZ = tempZ;
            } else {
                v.oldX = v.x;
                v.oldY = v.y;
                v.oldZ = v.z;
            }
        }
    }

    solveConstraints() {
        for (const constraint of this.constraints) {
            if (constraint.type === 'distance') {
                this.solveDistanceConstraint(constraint);
            }
        }
    }

    solveDistanceConstraint(constraint) {
        const p1 = this.vertices[constraint.p1];
        const p2 = this.vertices[constraint.p2];
        const w1 = this.invMass[constraint.p1];
        const w2 = this.invMass[constraint.p2];

        if (w1 === 0 && w2 === 0) return;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (currentDist > 0) {
            const diff = (currentDist - constraint.restLength) / currentDist;
            const correctionX = dx * diff * constraint.stiffness;
            const correctionY = dy * diff * constraint.stiffness;
            const correctionZ = dz * diff * constraint.stiffness;

            const totalMass = w1 + w2;
            const ratio1 = w1 / totalMass;
            const ratio2 = w2 / totalMass;

            if (w1 > 0) {
                p1.x += correctionX * ratio2;
                p1.y += correctionY * ratio2;
                p1.z += correctionZ * ratio2;
            }

            if (w2 > 0) {
                p2.x -= correctionX * ratio1;
                p2.y -= correctionY * ratio1;
                p2.z -= correctionZ * ratio1;
            }
        }
    }

    updateVelocities(dt) {
        if (dt <= 0) return;
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            if (!v.fixed && this.invMass[i] > 0) {
                const velX = (v.x - v.oldX) * this.damping;
                const velY = (v.y - v.oldY) * this.damping;
                const velZ = (v.z - v.oldZ) * this.damping;
                v.oldX = v.x - velX;
                v.oldY = v.y - velY;
                v.oldZ = v.z - velZ;
            }
        }
    }

    applyOscillation() {
        const centerY = Math.floor(this.segments / 2);
        const centerX = Math.floor(this.segments / 2);
        const centerIndex = centerY * (this.segments + 1) + centerX;
        const centerVertex = this.vertices[centerIndex];
        centerVertex.y = Math.sin(this.time * this.oscillationSpeed) * this.oscillationAmplitude;
        centerVertex.oldY = centerVertex.y;
    }

    setOscillationAmplitude(amplitude) {
        this.oscillationAmplitude = amplitude;
    }

    setOscillationSpeed(speed) {
        this.oscillationSpeed = speed;
    }

    // Новый метод для расчета нормалей
    calculateVertexNormals() {
        const normals = new Array(this.vertices.length).fill().map(() => ({x:0, y:0, z:0}));

        // Для каждого треугольника
        for (const tri of this.triangles) {
            const v0 = this.vertices[tri[0]];
            const v1 = this.vertices[tri[1]];
            const v2 = this.vertices[tri[2]];

            const edge1 = {x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z};
            const edge2 = {x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z};

            const nx = edge1.y * edge2.z - edge1.z * edge2.y;
            const ny = edge1.z * edge2.x - edge1.x * edge2.z;
            const nz = edge1.x * edge2.y - edge1.y * edge2.x;

            normals[tri[0]].x += nx;
            normals[tri[0]].y += ny;
            normals[tri[0]].z += nz;

            normals[tri[1]].x += nx;
            normals[tri[1]].y += ny;
            normals[tri[1]].z += nz;

            normals[tri[2]].x += nx;
            normals[tri[2]].y += ny;
            normals[tri[2]].z += nz;
        }

        // Нормализуем нормали вершин
        for (let i = 0; i < normals.length; i++) {
            const n = normals[i];
            const length = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            if (length > 0) {
                n.x /= length;
                n.y /= length;
                n.z /= length;
            } else {
                n.x = 0;
                n.y = 1;
                n.z = 0;
            }
            this.vertices[i].normal = {x: n.x, y: n.y, z: n.z};
        }
    }
}