export class WebGPURenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.device = null;
        this.context = null;
        this.pipeline = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.depthTexture = null;

        // Камера и свет
        this.cameraRotationX = -Math.PI / 4;
        this.cameraRotationY = Math.PI / 4;
        this.cameraDistance = 600;
        this.lightDirection = [0.7, 0.7, 0.2];
        this.ambientLight = 0.3;

        this.vertexCount = 0;
        this.indexCount = 0;
    }

    async init() {
        if (!navigator.gpu) throw new Error('WebGPU not supported');

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('No GPU adapter');
        this.device = await adapter.requestDevice();

        this.context = this.canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: format,
            alphaMode: 'premultiplied'
        });

        // Шейдеры
        const shaderModule = this.device.createShaderModule({ code: this.getShaderCode() });

        // Пайплайн
        this.pipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 6 * 4, // позиция + нормаль
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, // позиция
                        { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' } // нормаль
                    ]
                }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format: format }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        // Униформы
        this.uniformBuffer = this.device.createBuffer({
            size: 192,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
        });

        this.resize(this.canvas.width, this.canvas.height);
    }

    getShaderCode() {
        return `
struct Uniforms {
    modelViewProjection: mat4x4<f32>;
    lightDirection: vec3<f32>;
    ambientLight: f32;
};
@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>;
    @location(1) normal: vec3<f32>;
};
struct VertexOutput {
    @builtin(position) position: vec4<f32>;
    @location(0) worldPosition: vec3<f32>;
    @location(1) normal: vec3<f32>;
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjection * vec4<f32>(input.position, 1.0);
    output.worldPosition = input.position;
    output.normal = normalize(input.normal);
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let lightDir = normalize(uniforms.lightDirection);
    let normal = normalize(input.normal);
    let diffuse = max(dot(normal, lightDir), 0.0);
    let viewDir = normalize(-input.worldPosition);
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.5;

    let intensity = uniforms.ambientLight + diffuse * (1.0 - uniforms.ambientLight) + specular;

    let height = input.worldPosition.y;
    let baseColor = vec3<f32>(0.1, 0.2, 0.8);
    let highlightColor = vec3<f32>(0.8, 0.2, 0.1);
    let t = (height + 50.0) / 100.0;
    let color = mix(baseColor, highlightColor, clamp(t, 0.0, 1.0));
    return vec4<f32>(color * intensity, 1.0);
}
`;
    }

    updateVertexBuffer(vertices) {
        // Включает позиции и нормали
        const vertexData = new Float32Array(vertices.length * 6);
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            vertexData.set([v.x, v.y, v.z, v.normal.x, v.normal.y, v.normal.z], i * 6);
        }
        if (this.vertexBuffer) this.vertexBuffer.destroy();

        this.vertexBuffer = this.device.createBuffer({
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
        this.vertexBuffer.unmap();

        this.vertexCount = vertices.length;
    }

    updateIndexBuffer(triangles) {
        const indexData = new Uint16Array(triangles.flat());
        if (this.indexBuffer) this.indexBuffer.destroy();

        this.indexBuffer = this.device.createBuffer({
            size: indexData.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(indexData);
        this.indexBuffer.unmap();

        this.indexCount = indexData.length;
    }

    updateCamera(rotationX, rotationY, distance) {
        this.cameraRotationX = rotationX;
        this.cameraRotationY = rotationY;
        this.cameraDistance = distance;
    }

    setLightDirection(x, y, z) {
        this.lightDirection = [x, y, z];
    }

    setAmbientLight(intensity) {
        this.ambientLight = intensity;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.depthTexture) this.depthTexture.destroy();
        this.depthTexture = this.device.createTexture({
            size: [width, height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    render() {
        if (!this.vertexBuffer || !this.indexBuffer) return;

        const mvpMatrix = this.calculateMVPMatrix();

        // Запись данных в униформу
        const uniformData = new Float32Array(16 + 3 + 1);
        uniformData.set(mvpMatrix, 0);
        uniformData.set(this.lightDirection, 16);
        uniformData[19] = this.ambientLight;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData.buffer);

        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        });

        renderPass.setPipeline(this.pipeline);
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setIndexBuffer(this.indexBuffer, 'uint16');
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.drawIndexed(this.indexCount, 1, 0, 0, 0);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }

    calculateMVPMatrix() {
        const modelMatrix = this.createIdentityMatrix();
        const viewMatrix = this.createViewMatrix();
        const projectionMatrix = this.createProjectionMatrix();
        return this.multiplyMatrices(projectionMatrix, this.multiplyMatrices(viewMatrix, modelMatrix));
    }

    createIdentityMatrix() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    createViewMatrix() {
        const cosX = Math.cos(this.cameraRotationX);
        const sinX = Math.sin(this.cameraRotationX);
        const cosY = Math.cos(this.cameraRotationY);
        const sinY = Math.sin(this.cameraRotationY);

        const eye = [
            this.cameraDistance * sinY * cosX,
            this.cameraDistance * sinX,
            this.cameraDistance * cosY * cosX
        ];

        const center = [0, 0, 0];
        const up = [0, 1, 0];

        const z = this.normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
        const x = this.normalize(this.cross(up, z));
        const y = this.cross(z, x);

        return new Float32Array([
            x[0], y[0], z[0], 0,
            x[1], y[1], z[1], 0,
            x[2], y[2], z[2], 0,
            -this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
        ]);
    }

    createProjectionMatrix() {
        const aspect = this.canvas.width / this.canvas.height;
        const fov = Math.PI / 4;
        const near = 0.1;
        const far = 2000;

        const f = 1.0 / Math.tan(fov / 2);
        const rangeInv = 1.0 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ]);
    }

    multiplyMatrices(a, b) {
        const result = new Float32Array(16);
        for (let i=0; i<4; i++) {
            for (let j=0; j<4; j++) {
                result[i*4 + j] = 0;
                for (let k=0; k<4; k++) {
                    result[i*4 + j] += a[i*4 + k] * b[k*4 + j];
                }
            }
        }
        return result;
    }

    normalize(v) {
        const len = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
        if (len > 0) {
            return [v[0]/len, v[1]/len, v[2]/len];
        }
        return [0,0,0];
    }

    cross(a, b) {
        return [
            a[1]*b[2]-a[2]*b[1],
            a[2]*b[0]-a[0]*b[2],
            a[0]*b[1]-a[1]*b[0]
        ];
    }

    dot(a, b) {
        return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    }
}