// ========================================
// Image Processor - WebGL-based GPU Processing
// ========================================

class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.gl = this.canvas.getContext('webgl', {
            preserveDrawingBuffer: true,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.programs = {};
        this.textures = {};
        this.framebuffers = {};

        this.initShaders();
        this.setupGeometry();
    }

    // 初始化所有着色器程序
    initShaders() {
        const shaderTypes = [
            'heightFromDiffuse',
            'normalFromHeight',
            'edgeFromNormal',
            'aoFromNormal',
            'metallicGenerator',
            'roughnessGenerator',
            'gaussianBlur',
            'copy',
            'combineORM',
            'adjustLevels'
        ];

        shaderTypes.forEach(type => {
            this.programs[type] = this.createProgram(
                Shaders.vertexShader,
                Shaders[type]
            );
        });
    }

    // 创建WebGL程序
    createProgram(vertexShaderSource, fragmentShaderSource) {
        const gl = this.gl;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link failed:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        return program;
    }

    // 创建着色器
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
            console.error('Shader source:', source);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    // 设置几何体（全屏四边形）
    setupGeometry() {
        const gl = this.gl;

        // Position buffer
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // TexCoord buffer
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1,
        ]);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        this.positionBuffer = positionBuffer;
        this.texCoordBuffer = texCoordBuffer;
    }

    // 创建纹理
    createTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        } else if (image.width && image.height) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data || null);
        }

        return texture;
    }

    // 设置渲染目标
    setRenderTarget(width, height, texture = null) {
        const gl = this.gl;

        if (texture) {
            // 渲染到纹理
            if (!this.framebuffers.main) {
                this.framebuffers.main = gl.createFramebuffer();
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.main);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        } else {
            // 渲染到canvas
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.canvas.width = width;
        this.canvas.height = height;
        gl.viewport(0, 0, width, height);
    }

    // 渲染
    render(program, uniforms = {}) {
        const gl = this.gl;

        gl.useProgram(program);

        // 设置attributes
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // 设置uniforms
        let textureUnit = 0;
        Object.keys(uniforms).forEach(name => {
            const location = gl.getUniformLocation(program, name);
            if (!location) return;

            const value = uniforms[name];

            if (value.texture) {
                // 纹理uniform
                gl.activeTexture(gl.TEXTURE0 + textureUnit);
                gl.bindTexture(gl.TEXTURE_2D, value.texture);
                gl.uniform1i(location, textureUnit);
                textureUnit++;
            } else if (typeof value === 'number') {
                gl.uniform1f(location, value);
            } else if (value.length === 2) {
                gl.uniform2fv(location, value);
            } else if (value.length === 3) {
                gl.uniform3fv(location, value);
            } else if (value.length === 4) {
                gl.uniform4fv(location, value);
            }
        });

        // 绘制
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ========================================
    // 主要处理函数
    // ========================================

    // 处理漫反射/颜色调整
    processDiffuse(sourceImage, options = {}) {
        const defaults = {
            brightness: 0.0,
            contrast: 1.0,
            saturation: 1.0,
            hue: 0.0
        };

        const params = { ...defaults, ...options };
        const width = sourceImage.width;
        const height = sourceImage.height;

        const sourceTexture = this.createTexture(sourceImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        // Note: Assuming 'adjustLevels' shader supports these. 
        // If not, we might need to check the shader source. 
        // Since I can't check shader source easily (it's in shaders.js which I haven't read), 
        // I will assume standard adjustments or I should check Shaders.js first?
        // Let's check Shaders.js first to be safe.
        this.render(this.programs.adjustLevels, {
            u_image: { texture: sourceTexture },
            u_brightness: params.brightness,
            u_contrast: params.contrast,
            u_saturation: params.saturation,
            u_hue: params.hue
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(sourceTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 生成高度图
    generateHeightMap(sourceImage, options = {}) {
        const defaults = {
            blur0Weight: 0.15,
            blur1Weight: 0.19,
            blur2Weight: 0.24,
            blur3Weight: 0.42,
            finalGain: 0.0,
            intensity: 2.0
        };

        const params = { ...defaults, ...options };
        const width = sourceImage.width;
        const height = sourceImage.height;

        // 创建源纹理
        const sourceTexture = this.createTexture(sourceImage);

        // 创建输出纹理
        const outputTexture = this.createTexture({ width, height });

        // 设置渲染目标
        this.setRenderTarget(width, height, outputTexture);

        // 渲染
        this.render(this.programs.heightFromDiffuse, {
            u_image: { texture: sourceTexture },
            u_blur0Weight: params.blur0Weight,
            u_blur1Weight: params.blur1Weight,
            u_blur2Weight: params.blur2Weight,
            u_blur3Weight: params.blur3Weight,
            u_finalGain: params.finalGain,
            u_intensity: params.intensity,
            u_resolution: [width, height]
        });

        // 读取结果
        const result = this.readPixels(width, height);

        // 清理
        this.gl.deleteTexture(sourceTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 生成法线图
    generateNormalMap(heightImage, options = {}) {
        const defaults = {
            strength: 2.0,
            step: 1.0,
            levelBlur: 0.0,
            type: 'opengl' // 'opengl' or 'directx'
        };

        const params = { ...defaults, ...options };
        const width = heightImage.width;
        const height = heightImage.height;

        // Optional pre-blur for smoother normals
        let heightTexture;
        let tempBlurResult = null;

        if (params.levelBlur > 0.0) {
            const blurredData = this.applyGaussianBlur(heightImage, params.levelBlur);
            tempBlurResult = blurredData;
            heightTexture = this.createTexture(tempBlurResult);
        } else {
            heightTexture = this.createTexture(heightImage);
        }

        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        // OpenGL = Y+, DirectX = Y- (Invert G)
        const invertG = params.type === 'directx' ? 1.0 : 0.0;

        this.render(this.programs.normalFromHeight, {
            u_heightMap: { texture: heightTexture },
            u_strength: params.strength,
            u_step: params.step,
            u_invertR: 0.0,
            u_invertG: invertG,
            u_resolution: [width, height]
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(heightTexture);
        this.gl.deleteTexture(outputTexture);

        // Clean up temp blur buffers if any? 
        // readPixels returns new array, so tempBlurResult.data is safe to gc. 
        // We only need to make sure textures are deleted, which we did.

        return result;
    }

    // 生成边缘图
    generateEdgeMap(normalImage, options = {}) {
        const defaults = {
            edgeStrength: 2.0,
            threshold: 0.1
        };

        const params = { ...defaults, ...options };
        const width = normalImage.width;
        const height = normalImage.height;

        const normalTexture = this.createTexture(normalImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        this.render(this.programs.edgeFromNormal, {
            u_normalMap: { texture: normalTexture },
            u_edgeStrength: params.edgeStrength,
            u_threshold: params.threshold,
            u_resolution: [width, height]
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(normalTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 生成AO图
    generateAOMap(normalImage, heightImage, options = {}) {
        const defaults = {
            aoStrength: 1.0,
            aoSpread: 3.0,
            aoSamples: 16
        };

        const params = { ...defaults, ...options };
        const width = normalImage.width;
        const height = normalImage.height;

        const normalTexture = this.createTexture(normalImage);
        const heightTexture = this.createTexture(heightImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        this.render(this.programs.aoFromNormal, {
            u_normalMap: { texture: normalTexture },
            u_heightMap: { texture: heightTexture },
            u_aoStrength: params.aoStrength,
            u_aoSpread: params.aoSpread,
            u_aoSamples: params.aoSamples,
            u_resolution: [width, height]
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(normalTexture);
        this.gl.deleteTexture(heightTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 生成金属度图
    generateMetallicMap(diffuseImage, options = {}) {
        const defaults = {
            threshold: 0.5,
            smoothness: 0.1
        };

        const params = { ...defaults, ...options };
        const width = diffuseImage.width;
        const height = diffuseImage.height;

        const diffuseTexture = this.createTexture(diffuseImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        this.render(this.programs.metallicGenerator, {
            u_diffuseMap: { texture: diffuseTexture },
            u_threshold: params.threshold,
            u_smoothness: params.smoothness
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(diffuseTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 生成粗糙度图
    generateRoughnessMap(diffuseImage, normalImage, options = {}) {
        const defaults = {
            baseRoughness: 0.3,
            normalInfluence: 0.5
        };

        const params = { ...defaults, ...options };
        const width = diffuseImage.width;
        const height = diffuseImage.height;

        const diffuseTexture = this.createTexture(diffuseImage);
        const normalTexture = this.createTexture(normalImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        this.render(this.programs.roughnessGenerator, {
            u_diffuseMap: { texture: diffuseTexture },
            u_normalMap: { texture: normalTexture },
            u_baseRoughness: params.baseRoughness,
            u_normalInfluence: params.normalInfluence,
            u_resolution: [width, height]
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(diffuseTexture);
        this.gl.deleteTexture(normalTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 组合ORM图
    combineORMMap(aoImage, roughnessImage, metallicImage) {
        const width = aoImage.width;
        const height = aoImage.height;

        const aoTexture = this.createTexture(aoImage);
        const roughnessTexture = this.createTexture(roughnessImage);
        const metallicTexture = this.createTexture(metallicImage);
        const outputTexture = this.createTexture({ width, height });

        this.setRenderTarget(width, height, outputTexture);

        this.render(this.programs.combineORM, {
            u_aoMap: { texture: aoTexture },
            u_roughnessMap: { texture: roughnessTexture },
            u_metallicMap: { texture: metallicTexture }
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(aoTexture);
        this.gl.deleteTexture(roughnessTexture);
        this.gl.deleteTexture(metallicTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 高斯模糊
    applyGaussianBlur(image, blurSize = 2.0) {
        const width = image.width;
        const height = image.height;

        const inputTexture = this.createTexture(image);
        const tempTexture = this.createTexture({ width, height });
        const outputTexture = this.createTexture({ width, height });

        // Horizontal pass
        this.setRenderTarget(width, height, tempTexture);
        this.render(this.programs.gaussianBlur, {
            u_image: { texture: inputTexture },
            u_direction: [1, 0],
            u_resolution: [width, height],
            u_blurSize: blurSize
        });

        // Vertical pass
        this.setRenderTarget(width, height, outputTexture);
        this.render(this.programs.gaussianBlur, {
            u_image: { texture: tempTexture },
            u_direction: [0, 1],
            u_resolution: [width, height],
            u_blurSize: blurSize
        });

        const result = this.readPixels(width, height);

        this.gl.deleteTexture(inputTexture);
        this.gl.deleteTexture(tempTexture);
        this.gl.deleteTexture(outputTexture);

        return result;
    }

    // 读取像素数据
    readPixels(width, height) {
        const gl = this.gl;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        return {
            data: pixels,
            width: width,
            height: height
        };
    }

    // 转换为Canvas
    toCanvas(imageData) {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(imageData.width, imageData.height);
        imgData.data.set(imageData.data);
        ctx.putImageData(imgData, 0, 0);

        return canvas;
    }

    // 销毁
    dispose() {
        const gl = this.gl;

        // 删除所有程序
        Object.values(this.programs).forEach(program => {
            if (program) gl.deleteProgram(program);
        });

        // 删除所有framebuffer
        Object.values(this.framebuffers).forEach(fb => {
            if (fb) gl.deleteFramebuffer(fb);
        });

        // 删除buffer
        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessor;
}
