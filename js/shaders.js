// ========================================
// WebGL Shaders for Image Processing
// ========================================

const Shaders = {
    // Vertex Shader (通用)
    vertexShader: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `,

    // Height From Diffuse - 从漫反射图生成高度图
    heightFromDiffuse: `
        precision highp float;
        
        uniform sampler2D u_image;
        uniform float u_blur0Weight;
        uniform float u_blur1Weight;
        uniform float u_blur2Weight;
        uniform float u_blur3Weight;
        uniform float u_finalGain;
        uniform float u_intensity;
        uniform vec2 u_resolution;
        
        varying vec2 v_texCoord;
        
        // Convert RGB to grayscale
        float rgb2gray(vec3 color) {
            return dot(color, vec3(0.299, 0.587, 0.114));
        }
        
        void main() {
            vec2 uv = v_texCoord;
            vec2 pixelSize = 1.0 / u_resolution;
            
            // 简单的方法：使用亮度作为高度
            // 亮的地方高，暗的地方低
            vec3 color = texture2D(u_image, uv).rgb;
            float brightness = rgb2gray(color);
            
            // 添加一些邻域对比度来增强细节
            float contrast = 0.0;
            for (float x = -1.0; x <= 1.0; x += 1.0) {
                for (float y = -1.0; y <= 1.0; y += 1.0) {
                    if (x == 0.0 && y == 0.0) continue;
                    vec2 offset = vec2(x, y) * pixelSize;
                    float neighborBrightness = rgb2gray(texture2D(u_image, uv + offset).rgb);
                    contrast += abs(brightness - neighborBrightness);
                }
            }
            contrast /= 8.0;
            
            // 组合亮度和对比度
            float height = brightness * 0.7 + contrast * 0.3;
            
            // 增强对比度
            height = (height - 0.5) * u_intensity + 0.5;
            height = clamp(height, 0.0, 1.0);
            
            gl_FragColor = vec4(vec3(height), 1.0);
        }
    `,

    // Normal From Height - 从高度图生成法线图
    // Normal From Height - 从高度图生成法线图
    normalFromHeight: `
        precision highp float;
        
        uniform sampler2D u_heightMap;
        uniform float u_strength;
        uniform float u_step;
        uniform float u_invertR;
        uniform float u_invertG;
        uniform vec2 u_resolution;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec2 pixelSize = 1.0 / u_resolution;
            vec2 uv = v_texCoord;
            
            // Sobel 算子采样
            // TL T TR
            //  L   R
            // BL B BR
            
            float step = max(1.0, u_step);
            vec2 off = pixelSize * step;
            
            float tl = texture2D(u_heightMap, uv + vec2(-off.x, off.y)).r;
            float t  = texture2D(u_heightMap, uv + vec2(0.0, off.y)).r;
            float tr = texture2D(u_heightMap, uv + vec2(off.x, off.y)).r;
            float l  = texture2D(u_heightMap, uv + vec2(-off.x, 0.0)).r;
            float r  = texture2D(u_heightMap, uv + vec2(off.x, 0.0)).r;
            float bl = texture2D(u_heightMap, uv + vec2(-off.x, -off.y)).r;
            float b  = texture2D(u_heightMap, uv + vec2(0.0, -off.y)).r;
            float br = texture2D(u_heightMap, uv + vec2(off.x, -off.y)).r;
            
            // Sobel X kernel:
            // -1 0 1
            // -2 0 2
            // -1 0 1
            float dX = tr + 2.0*r + br - (tl + 2.0*l + bl);
            
            // Sobel Y kernel:
            //  1  2  1
            //  0  0  0
            // -1 -2 -1
            float dY = tl + 2.0*t + tr - (bl + 2.0*b + br);
            
            // Apply strength
            // For standard range, we might need to adjust multiplier.
            // dX/dY range roughly -4 to 4 if height is 0-1.
            float strength = u_strength;
            
            vec3 normal = normalize(vec3(-dX * strength, -dY * strength, 1.0));
            
            // Invert channels if needed
            if (u_invertR > 0.5) normal.x = -normal.x;
            if (u_invertG > 0.5) normal.y = -normal.y;
            
            // Map to [0, 1]
            gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
        }
    `,

    // Edge Detection - 从法线图检测边缘
    edgeFromNormal: `
        precision highp float;
        
        uniform sampler2D u_normalMap;
        uniform float u_edgeStrength;
        uniform float u_threshold;
        uniform vec2 u_resolution;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec2 pixelSize = 1.0 / u_resolution;
            vec2 uv = v_texCoord;
            
            // 使用Sobel算子检测边缘
            vec3 tl = texture2D(u_normalMap, uv + vec2(-pixelSize.x, pixelSize.y)).rgb;
            vec3 t  = texture2D(u_normalMap, uv + vec2(0.0, pixelSize.y)).rgb;
            vec3 tr = texture2D(u_normalMap, uv + vec2(pixelSize.x, pixelSize.y)).rgb;
            vec3 l  = texture2D(u_normalMap, uv + vec2(-pixelSize.x, 0.0)).rgb;
            vec3 r  = texture2D(u_normalMap, uv + vec2(pixelSize.x, 0.0)).rgb;
            vec3 bl = texture2D(u_normalMap, uv + vec2(-pixelSize.x, -pixelSize.y)).rgb;
            vec3 b  = texture2D(u_normalMap, uv + vec2(0.0, -pixelSize.y)).rgb;
            vec3 br = texture2D(u_normalMap, uv + vec2(pixelSize.x, -pixelSize.y)).rgb;
            
            // Sobel X
            vec3 sobelX = -tl - 2.0*l - bl + tr + 2.0*r + br;
            // Sobel Y
            vec3 sobelY = tl + 2.0*t + tr - bl - 2.0*b - br;
            
            // 边缘强度
            float edge = length(sobelX) + length(sobelY);
            edge = edge / 8.0;  // 归一化
            edge *= u_edgeStrength;
            
            // 反转：边缘为黑色，平坦区域为白色（这更符合传统的边缘图）
            edge = 1.0 - edge;
            edge = smoothstep(0.3, 0.7, edge);
            
            gl_FragColor = vec4(vec3(edge), 1.0);
        }
    `,

    // Ambient Occlusion - 从法线图生成AO
    aoFromNormal: `
        precision highp float;
        
        uniform sampler2D u_normalMap;
        uniform sampler2D u_heightMap;
        uniform float u_aoStrength;
        uniform float u_aoSpread;
        uniform float u_aoSamples;
        uniform vec2 u_resolution;
        
        varying vec2 v_texCoord;
        
        const float PI = 3.14159265359;
        const int MAX_SAMPLES = 16;
        
        // Random function
        float random(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
            vec2 uv = v_texCoord;
            vec2 pixelSize = 1.0 / u_resolution;
            
            vec3 normal = texture2D(u_normalMap, uv).rgb * 2.0 - 1.0;
            float centerHeight = texture2D(u_heightMap, uv).r;
            
            float ao = 0.0;
            float samples = u_aoSamples < float(MAX_SAMPLES) ? u_aoSamples : float(MAX_SAMPLES);

            
            // Sample surrounding area
            for (int i = 0; i < MAX_SAMPLES; i++) {
                if (float(i) >= samples) break;
                
                float angle = float(i) * (2.0 * PI / samples);
                vec2 offset = vec2(cos(angle), sin(angle)) * u_aoSpread * pixelSize;
                
                float sampleHeight = texture2D(u_heightMap, uv + offset).r;
                float diff = max(0.0, sampleHeight - centerHeight);
                ao += diff;
            }
            
            ao = 1.0 - (ao / samples * u_aoStrength);
            ao = clamp(ao, 0.0, 1.0);
            
            gl_FragColor = vec4(vec3(ao), 1.0);
        }
    `,

    // Metallic Map Generator
    metallicGenerator: `
        precision highp float;
        
        uniform sampler2D u_diffuseMap;
        uniform float u_threshold;
        uniform float u_smoothness;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec3 color = texture2D(u_diffuseMap, v_texCoord).rgb;
            
            // Detect metallic based on color properties
            float luminance = dot(color, vec3(0.299, 0.587, 0.114));
            float saturation = max(max(color.r, color.g), color.b) - min(min(color.r, color.g), color.b);
            
            // Metallic surfaces tend to have high luminance and low saturation
            float metallic = luminance * (1.0 - saturation);
            metallic = smoothstep(u_threshold - u_smoothness, u_threshold + u_smoothness, metallic);
            
            gl_FragColor = vec4(vec3(metallic), 1.0);
        }
    `,

    // Roughness Map Generator
    roughnessGenerator: `
        precision highp float;
        
        uniform sampler2D u_diffuseMap;
        uniform sampler2D u_normalMap;
        uniform float u_baseRoughness;
        uniform float u_normalInfluence;
        uniform vec2 u_resolution;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec2 uv = v_texCoord;
            vec2 pixelSize = 1.0 / u_resolution;
            
            // Sample color variation
            vec3 center = texture2D(u_diffuseMap, uv).rgb;
            float variation = 0.0;
            
            for (float x = -1.0; x <= 1.0; x += 1.0) {
                for (float y = -1.0; y <= 1.0; y += 1.0) {
                    vec3 sample = texture2D(u_diffuseMap, uv + vec2(x, y) * pixelSize).rgb;
                    variation += distance(center, sample);
                }
            }
            variation /= 9.0;
            
            // Normal variation (smooth surfaces have consistent normals)
            vec3 normal = texture2D(u_normalMap, uv).rgb;
            float normalVar = 0.0;
            
            for (float x = -1.0; x <= 1.0; x += 1.0) {
                for (float y = -1.0; y <= 1.0; y += 1.0) {
                    vec3 sampleNormal = texture2D(u_normalMap, uv + vec2(x, y) * pixelSize).rgb;
                    normalVar += distance(normal, sampleNormal);
                }
            }
            normalVar /= 9.0;
            
            float roughness = u_baseRoughness + variation + normalVar * u_normalInfluence;
            roughness = clamp(roughness, 0.0, 1.0);
            
            gl_FragColor = vec4(vec3(roughness), 1.0);
        }
    `,

    // Gaussian Blur
    gaussianBlur: `
        precision highp float;
        
        uniform sampler2D u_image;
        uniform vec2 u_direction;
        uniform vec2 u_resolution;
        uniform float u_blurSize;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec2 pixelSize = 1.0 / u_resolution;
            vec4 color = vec4(0.0);
            float total = 0.0;
            
            float blurSize = u_blurSize;
            
            for (float i = -4.0; i <= 4.0; i += 1.0) {
                float weight = exp(-(i * i) / (2.0 * blurSize * blurSize));
                color += texture2D(u_image, v_texCoord + i * u_direction * pixelSize) * weight;
                total += weight;
            }
            
            gl_FragColor = color / total;
        }
    `,

    // Simple copy/blit shader
    copy: `
        precision highp float;
        
        uniform sampler2D u_image;
        varying vec2 v_texCoord;
        
        void main() {
            gl_FragColor = texture2D(u_image, v_texCoord);
        }
    `,

    // Combine channels for ORM map (Occlusion, Roughness, Metallic)
    combineORM: `
        precision highp float;
        
        uniform sampler2D u_aoMap;
        uniform sampler2D u_roughnessMap;
        uniform sampler2D u_metallicMap;
        
        varying vec2 v_texCoord;
        
        void main() {
            float ao = texture2D(u_aoMap, v_texCoord).r;
            float roughness = texture2D(u_roughnessMap, v_texCoord).r;
            float metallic = texture2D(u_metallicMap, v_texCoord).r;
            
            gl_FragColor = vec4(ao, roughness, metallic, 1.0);
        }
    `,

    // Adjust levels (brightness, contrast, saturation, hue)
    adjustLevels: `
        precision highp float;
        
        uniform sampler2D u_image;
        uniform float u_brightness;
        uniform float u_contrast;
        uniform float u_saturation;
        uniform float u_hue;
        
        varying vec2 v_texCoord;
        
        // RGB to HSL and back not strictly needed if we just do saturation on RGB
        // Simple Saturation: Lerp between grayscale and color
        
        vec3 adjustSaturation(vec3 color, float saturation) {
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            return mix(vec3(gray), color, saturation);
        }
        
        vec3 adjustHue(vec3 color, float hue) {
             const vec3 k = vec3(0.57735, 0.57735, 0.57735);
             float cosAngle = cos(hue);
             return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
        }

        void main() {
            vec4 color = texture2D(u_image, v_texCoord);
            
            // Apply Hue
            if (u_hue != 0.0) {
                color.rgb = adjustHue(color.rgb, u_hue * 3.14159); // hue inputs -1 to 1 range approx
            }

            // Apply Contrast
            color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
            
            // Apply Brightness
            color.rgb += u_brightness;
            
            // Apply Saturation
            color.rgb = adjustSaturation(color.rgb, u_saturation);
            
            // Clamp
            color.rgb = clamp(color.rgb, 0.0, 1.0);
            
            gl_FragColor = color;
        }
    `
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Shaders;
}
