// Vertex shader
struct Uniforms {
    modelViewProjection: mat4x4<f32>,
    lightDirection: vec3<f32>,
    ambientLight: f32,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
    @location(0) position: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) worldPosition: vec3<f32>,
    @location(1) normal: vec3<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjection * vec4<f32>(input.position, 1.0);
    output.worldPosition = input.position;
    
    // Simple normal calculation (would need proper normals for better lighting)
    output.normal = vec3<f32>(0.0, 1.0, 0.0);
    
    return output;
}

// Fragment shader with advanced lighting
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Calculate lighting using Phong model
    let lightDir = normalize(uniforms.lightDirection);
    let normal = normalize(input.normal);
    
    // Diffuse lighting
    let diffuse = max(dot(normal, lightDir), 0.0);
    
    // Specular lighting (simplified)
    let viewDir = normalize(-input.worldPosition);
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0) * 0.5;
    
    // Combined lighting
    let intensity = uniforms.ambientLight + diffuse * (1.0 - uniforms.ambientLight) + specular;
    
    // Color based on height with gradient
    let height = input.worldPosition.y;
    let baseColor = vec3<f32>(0.1, 0.2, 0.8);
    let highlightColor = vec3<f32>(0.8, 0.2, 0.1);
    let t = (height + 50.0) / 100.0;
    let color = mix(baseColor, highlightColor, clamp(t, 0.0, 1.0));
    
    // Final color with lighting
    return vec4<f32>(color * intensity, 1.0);
}