// Enhanced vertex shader with better lighting
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) color: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) worldPos: vec3<f32>,
};

struct Uniforms {
    modelViewProjection: mat4x4<f32>,
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
    time: f32,
    lightPosition: vec3<f32>,
    cameraPosition: vec3<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    // Animate the cloth with enhanced wave effect
    let wave1 = sin(input.position.x * 8.0 + uniforms.time * 2.0) * 0.1;
    let wave2 = cos(input.position.z * 6.0 + uniforms.time * 1.5) * 0.08;
    let animatedPosition = vec3<f32>(
        input.position.x,
        input.position.y + wave1 + wave2,
        input.position.z
    );
    
    let worldPosition = uniforms.model * vec4<f32>(animatedPosition, 1.0);
    output.worldPos = worldPosition.xyz;
    output.position = uniforms.projection * uniforms.view * worldPosition;
    
    // Transform normal to world space
    output.normal = normalize((uniforms.model * vec4<f32>(input.normal, 0.0)).xyz);
    
    // Enhanced color with time-based variation
    let baseColor = input.color;
    let timeEffect = sin(uniforms.time * 0.5) * 0.1 + 0.9;
    output.color = baseColor * timeEffect;
    
    return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Enhanced Phong lighting model
    let lightDir = normalize(uniforms.lightPosition - input.worldPos);
    let viewDir = normalize(uniforms.cameraPosition - input.worldPos);
    let normal = normalize(input.normal);
    
    // Ambient - increased for better visibility
    let ambient = vec3<f32>(0.3, 0.3, 0.4);
    
    // Diffuse - enhanced
    let diff = max(dot(normal, lightDir), 0.0);
    let diffuse = diff * vec3<f32>(1.0, 1.0, 0.9);
    
    // Specular - added for shine
    let reflectDir = reflect(-lightDir, normal);
    let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    let specular = spec * vec3<f32>(0.5, 0.5, 0.6);
    
    // Combined lighting with enhanced brightness
    let lighting = ambient + diffuse * 1.2 + specular * 0.8;
    
    // Final color with enhanced contrast and brightness
    let finalColor = input.color * lighting * 1.3;
    
    // Add a subtle glow effect
    let glow = pow(dot(normal, viewDir), 2.0) * 0.1;
    let finalColorWithGlow = finalColor + vec3<f32>(0.1, 0.1, 0.2) * glow;
    
    return vec4<f32>(finalColorWithGlow, 0.95);
}

// Enhanced cloth simulation compute shader
struct ClothParticle {
    position: vec3<f32>,
    oldPosition: vec3<f32>,
    velocity: vec3<f32>,
    mass: f32,
    fixed: f32,
    normal: vec3<f32>,
};

struct Spring {
    pointA: u32,
    pointB: u32,
    restLength: f32,
    strength: f32,
};

@group(0) @binding(1) var<storage, read_write> particles: array<ClothParticle>;
@group(0) @binding(2) var<storage, read> springs: array<Spring>;
@group(0) @binding(3) var<uniform> simulationParams: SimulationParams;

struct SimulationParams {
    deltaTime: f32,
    gravity: f32,
    damping: f32,
    windStrength: f32,
    windDirection: vec3<f32>,
    time: f32,
};

@compute @workgroup_size(64)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let particleIndex = global_id.x;
    
    if (particleIndex >= arrayLength(&particles)) {
        return;
    }
    
    var particle = particles[particleIndex];
    
    if (particle.fixed == 0.0) {
        // Verlet integration with enhanced physics
        let velocity = particle.position - particle.oldPosition;
        particle.oldPosition = particle.position;
        
        // Apply enhanced forces
        var acceleration = vec3<f32>(0.0, -simulationParams.gravity, 0.0);
        
        // Add wind force with turbulence
        let windNoise = sin(particle.position.x * 0.1 + simulationParams.time) * 
                        cos(particle.position.z * 0.1 + simulationParams.time) * 0.5;
        let windForce = simulationParams.windDirection * 
                       (simulationParams.windStrength + windNoise * 0.3);
        acceleration += windForce;
        
        // Enhanced damping
        acceleration += -velocity * simulationParams.damping;
        
        // Update position
        particle.position += velocity + acceleration * simulationParams.deltaTime * simulationParams.deltaTime;
        
        // Update normal (simplified)
        particle.normal = normalize(particle.position - particle.oldPosition);
    }
    
    particles[particleIndex] = particle;
}

// Additional shader for post-processing effects
struct PostProcessUniforms {
    brightness: f32,
    contrast: f32,
    saturation: f32,
    time: f32,
};

@group(1) @binding(0) var<uniform> postParams: PostProcessUniforms;
@group(1) @binding(1) var screenTexture: texture_2d<f32>;
@group(1) @binding(2) var screenSampler: sampler;

@fragment
fn post_process_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let texCoords = vec2<f32>(coord.x / 1280.0, coord.y / 720.0); // Adjust to screen size
    var color = textureSample(screenTexture, screenSampler, texCoords);
    
    // Apply brightness and contrast
    color.rgb = (color.rgb - 0.5) * postParams.contrast + 0.5;
    color.rgb *= postParams.brightness;
    
    // Apply saturation
    let luminance = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    color.rgb = mix(vec3<f32>(luminance), color.rgb, postParams.saturation);
    
    // Add subtle vignette effect
    let uv = texCoords * 2.0 - 1.0;
    let vignette = 1.0 - dot(uv, uv) * 0.3;
    color.rgb *= vignette;
    
    // Add subtle scanlines or film grain
    let grain = fract(sin(dot(texCoords, vec2<f32>(12.9898, 78.233))) * 43758.5453) * 0.02;
    color.rgb += grain;
    
    return color;
}