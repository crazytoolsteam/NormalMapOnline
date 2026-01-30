// ========================================
// Main Application
// ========================================

const I18N = {
    'zh-CN': {
        'webgl_error': '您的浏览器不支持WebGL，部分功能可能无法使用',
        'init_processor_fail': '初始化图像处理器失败',
        'file_type_error': '不支持的文件格式',
        'file_size_error': '文件太大，请选择小于50MB的图片',
        'loading': '加载图片...',
        'load_success': '图片加载成功，正在生成所有贴图...',
        'load_fail': '加载图片失败',
        'global_settings': '全局设置功能开发中...',
        'reset_defaults': '重置默认值',
        'params_reset': '参数已重置',
        'upload_first': '请先上传源图片',
        'generating': '生成',
        'generate_success': '生成成功',
        'generate_fail': '生成失败',
        'need_maps': '请先生成AO、粗糙度和金属度贴图',
        'nothing_download': '没有什么可下载的',
        'packaging': '正在打包...',
        'no_maps': '没有生成的贴图可下载',
        'download_start': '下载已开始',
        'package_fail': '打包失败',
        'download_fail': '下载出错',
        'generate_first': '请先生成贴图',
        'preview_fail': '预览功能初始化失败',
        'edit_dev': '编辑功能开发中...',
        'preview_title': ' 预览',
        'settings_title': ' 参数',

        'diffuse': '漫反射',
        'height': '高度图',
        'normal': '法线图',
        'metallic': '金属度',
        'roughness': '粗糙度',
        'ao': 'AO图',
        'edge': '边缘图',
        'combined': '组合图',

        'Brightness': '亮度',
        'Contrast': '对比度',
        'Saturation': '饱和度',
        'Hue': '色相',
        'Displacement': '置换',
        'Intensity': '强度',
        'Subdivision': '细分',
        'Strength': '强度',
        'Filter Step': '过滤步长',
        'Blur': '模糊',
        'Format': '格式',
        'Threshold': '阈值',
        'Smoothness': '平滑度',
        'Base': '基础值',
        'Details': '细节',
        'base': '基础值',
        'Details': '细节',
        'Spread': '扩散',
        'click_to_tune': '👈 点击按钮调节更多参数',
        'all_maps_generated': '所有贴图生成完毕'
    },
    'en': {
        'webgl_error': 'Your browser does not support WebGL, some features may not work.',
        'init_processor_fail': 'Failed to initialize image processor',
        'file_type_error': 'Unsupported file format',
        'file_size_error': 'File too large, please select an image smaller than 50MB',
        'loading': 'Loading image...',
        'load_success': 'Image loaded successfully, generating all maps...',
        'load_fail': 'Failed to load image',
        'global_settings': 'Global settings under development...',
        'reset_defaults': 'Reset to Defaults',
        'params_reset': 'Parameters reset',
        'upload_first': 'Please upload a source image first',
        'generating': 'Generating ',
        'generate_success': ' generated successfully',
        'generate_fail': 'Failed to generate ',
        'need_maps': 'Please generate AO, Roughness and Metallic maps first',
        'nothing_download': 'Nothing to download',
        'packaging': 'Packaging...',
        'no_maps': 'No generated maps to download',
        'download_start': 'Download started',
        'package_fail': 'Packaging failed',
        'download_fail': 'Download error',
        'generate_first': 'Please generate map first',
        'preview_fail': 'Preview initialization failed',
        'edit_dev': 'Edit feature under development...',
        'preview_title': ' Preview',
        'settings_title': ' Settings',

        'diffuse': 'Diffuse',
        'height': 'Height',
        'normal': 'Normal',
        'metallic': 'Metallic',
        'roughness': 'Roughness',
        'ao': 'Ambient Occlusion',
        'edge': 'Edge',
        'combined': 'Combined',

        'Brightness': 'Brightness',
        'Contrast': 'Contrast',
        'Saturation': 'Saturation',
        'Hue': 'Hue',
        'Displacement': 'Displacement',
        'Intensity': 'Intensity',
        'Subdivision': 'Subdivision',
        'Strength': 'Strength',
        'Filter Step': 'Filter Step',
        'Blur': 'Blur',
        'Format': 'Format',
        'Threshold': 'Threshold',
        'Smoothness': 'Smoothness',
        'Base': 'Base',
        'Details': 'Details',
        'Spread': 'Spread',
        'click_to_tune': '👈 Click buttons to tune parameters',
        'all_maps_generated': 'All maps generated successfully'
    }
};

class PBRGenApp {
    constructor() {
        this.processor = null;
        this.renderer = null;
        this.sourceImage = null;
        this.maps = {
            height: null,
            diffuse: null,
            normal: null,
            metallic: null,
            roughness: null,
            ao: null,
            edge: null,
            combined: null
        };

        this.tuningParams = {
            diffuse: { brightness: 0.0, contrast: 1.0, saturation: 1.0, hue: 0.0 },
            height: { intensity: 2.0, blur0Weight: 0.15, blur1Weight: 0.19, blur2Weight: 0.24, blur3Weight: 0.42, displacementScale: 0.0, subdivision: 128 },
            normal: { strength: 2.0, levelBlur: 0.0, step: 1.0, type: 'opengl' },
            metallic: { threshold: 0.5, smoothness: 0.1 },
            roughness: { baseRoughness: 0.3, normalInfluence: 0.5 },
            ao: { aoStrength: 1.0, aoSpread: 3.0, aoSamples: 16 },
            edge: { edgeStrength: 2.0, threshold: 0.1 }
        };

        this.tuningConfig = {
            diffuse: [
                { id: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.01 },
                { id: 'contrast', label: 'Contrast', min: 0.0, max: 2.0, step: 0.01 },
                { id: 'saturation', label: 'Saturation', min: 0.0, max: 2.0, step: 0.01 },
                { id: 'hue', label: 'Hue', min: -1.0, max: 1.0, step: 0.01 }
            ],
            height: [
                { id: 'displacementScale', label: 'Displacement', min: 0.0, max: 0.5, step: 0.001 },
                { id: 'intensity', label: 'Intensity', min: 0.0, max: 10.0, step: 0.1 },
                { id: 'subdivision', label: 'Subdivision', min: 16, max: 512, step: 16 }
            ],
            normal: [
                { id: 'strength', label: 'Strength', min: 0.1, max: 20.0, step: 0.1 },
                { id: 'step', label: 'Filter Step', min: 1.0, max: 5.0, step: 1.0 },
                { id: 'levelBlur', label: 'Blur', min: 0.0, max: 10.0, step: 0.1 },
                {
                    id: 'type', label: 'Format', type: 'select', options: [
                        { value: 'opengl', text: 'OpenGL (Y+)' },
                        { value: 'directx', text: 'DirectX (Y-)' }
                    ]
                }
            ],
            metallic: [
                { id: 'threshold', label: 'Threshold', min: 0.0, max: 1.0, step: 0.01 },
                { id: 'smoothness', label: 'Smoothness', min: 0.0, max: 1.0, step: 0.01 }
            ],
            roughness: [
                { id: 'baseRoughness', label: 'Base', min: 0.0, max: 1.0, step: 0.01 },
                { id: 'normalInfluence', label: 'Details', min: 0.0, max: 1.0, step: 0.01 }
            ],
            ao: [
                { id: 'aoStrength', label: 'Strength', min: 0.0, max: 5.0, step: 0.1 },
                { id: 'aoSpread', label: 'Spread', min: 0.0, max: 10.0, step: 0.1 }
            ],
            edge: [
                { id: 'edgeStrength', label: 'Strength', min: 0.0, max: 10.0, step: 0.1 },
                { id: 'threshold', label: 'Threshold', min: 0.0, max: 1.0, step: 0.01 }
            ]
        };

        // Debounce map generation
        this.debouncedGenerate = Utils.debounce((mapType) => {
            this.generateMap(mapType, true); // true for 'isTuning'
        }, 50);

        this.init();
    }

    t(key) {
        const lang = document.documentElement.lang || 'en';
        // Fallback to English if key missing in current lang
        return I18N[lang]?.[key] || I18N['en']?.[key] || key;
    }

    getMapName(type) {
        return this.t(type);
    }

    async init() {
        // Check WebGL support
        if (!Utils.checkWebGLSupport()) {
            Utils.showToast(this.t('webgl_error'), 'error');
            return;
        }

        // Initialize processor
        try {
            this.processor = new ImageProcessor();
        } catch (err) {
            console.error('Failed to initialize processor:', err);
            Utils.showToast(this.t('init_processor_fail'), 'error');
        }

        // Initialize 3D renderer
        try {
            const canvas = document.getElementById('previewCanvas');
            this.renderer = new Renderer3D(canvas);
        } catch (err) {
            console.error('Failed to initialize renderer:', err);
        }

        this.setupEventListeners();
        // this.loadSettings(); // TODO: Implement settings persistence
    }

    setupEventListeners() {
        // 1. File Upload
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        // Click upload area to trigger file input
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', (e) => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) this.handleFileSelect(file);
            });
        }

        // 1.5. Sample Thumbnails
        document.querySelectorAll('.sample-thumb').forEach(thumb => {
            thumb.addEventListener('click', async (e) => {
                e.stopPropagation();
                const src = thumb.dataset.src;
                if (src) {
                    try {
                        Utils.showLoading(true, this.t('loading'));
                        // Add cache bursting to ensure fresh load if needed, or just normal load
                        const response = await fetch(src);
                        if (!response.ok) throw new Error('Network response was not ok');

                        const blob = await response.blob();
                        const filename = src.split('/').pop();
                        // Create a File object from the blob
                        const file = new File([blob], filename, { type: blob.type });

                        // Use existing handler
                        this.handleFileSelect(file);
                    } catch (err) {
                        console.error('Failed to load sample:', err);
                        Utils.showToast(this.t('load_fail'), 'error');
                        Utils.showLoading(false);
                    }
                }
            });
        });

        // 2. Clear Source
        const clearSourceBtn = document.getElementById('clearSourceBtn');
        if (clearSourceBtn) {
            clearSourceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearSource();
            });
        }

        // 3. Map Card Actions (Event Delegation or Individual Binding)
        document.querySelectorAll('.map-card').forEach(card => {
            const mapType = card.dataset.mapType;

            // Generate
            const generateBtn = card.querySelector('[data-action="generate"]');
            if (generateBtn) {
                generateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.generateMap(mapType);
                });
            }

            // Settings
            const settingsBtn = card.querySelector('[data-action="settings"]');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openMapSettings(mapType);
                });
            }

            // Download
            const downloadBtn = card.querySelector('[data-action="download"]');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.downloadMap(mapType);
                });
            }

            // Preview
            const previewBtn = card.querySelector('[data-action="preview"]');
            if (previewBtn) {
                previewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.previewMap(mapType);
                });
            }

            // Edit (Diffuse only)
            const editBtn = card.querySelector('[data-action="edit"]');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editMap(mapType);
                });
            }
        });

        // 4. Batch Actions
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        if (downloadAllBtn) downloadAllBtn.addEventListener('click', () => this.downloadAllMaps());

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearSource());

        // 5. 3D Preview Controls
        const meshSelect = document.getElementById('meshSelect');
        if (meshSelect) {
            meshSelect.addEventListener('change', (e) => {
                if (this.renderer) this.renderer.setMesh(e.target.value);
            });
        }

        const envSelect = document.getElementById('envSelect');
        const hdrFileInput = document.getElementById('hdrFileInput');
        const uploadHdrBtn = document.getElementById('uploadHdrBtn');

        if (envSelect) {
            let lastEnvValue = envSelect.value;

            // Allow re-selecting 'custom' by clearing value on click
            envSelect.addEventListener('click', () => {
                if (envSelect.value) {
                    lastEnvValue = envSelect.value;
                    envSelect.value = '';
                }
            });

            // Restore if cancelled (blur without selection)
            envSelect.addEventListener('blur', () => {
                if (!envSelect.value) {
                    envSelect.value = lastEnvValue;
                }
            });

            envSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) lastEnvValue = val;

                if (val === 'custom') {
                    // Trigger file input
                    if (hdrFileInput) hdrFileInput.click();
                } else {
                    if (this.renderer) this.renderer.setEnvironment(val);
                }
            });
        }

        if (uploadHdrBtn) {
            uploadHdrBtn.addEventListener('click', () => {
                if (hdrFileInput) hdrFileInput.click();
            });
        }

        if (hdrFileInput) {
            hdrFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && this.renderer) {
                    this.renderer.loadCustomHDR(file);
                    // Update select to show custom is active
                    if (envSelect) envSelect.value = 'custom';
                }
                // Reset input to allow re-selecting the same file
                e.target.value = '';
            });
        }

        // UV Controls
        // UV Controls
        const uvScaleU = document.getElementById('uvScaleU');
        const uvScaleV = document.getElementById('uvScaleV');
        const uvScaleUInput = document.getElementById('uvScaleUInput');
        const uvScaleVInput = document.getElementById('uvScaleVInput');

        const updateUV = (source, type) => {
            let u, v;

            if (source === 'slider') {
                u = parseFloat(uvScaleU.value);
                v = parseFloat(uvScaleV.value);
                if (uvScaleUInput) uvScaleUInput.value = u.toFixed(1);
                if (uvScaleVInput) uvScaleVInput.value = v.toFixed(1);
            } else {
                u = parseFloat(uvScaleUInput.value);
                v = parseFloat(uvScaleVInput.value);
                if (uvScaleU) uvScaleU.value = u;
                if (uvScaleV) uvScaleV.value = v;
            }

            if (this.renderer) this.renderer.setUVRepeat(u, v);
        };

        if (uvScaleU) uvScaleU.addEventListener('input', () => updateUV('slider', 'u'));
        if (uvScaleV) uvScaleV.addEventListener('input', () => updateUV('slider', 'v'));

        if (uvScaleUInput) {
            uvScaleUInput.addEventListener('input', () => updateUV('number', 'u'));
            uvScaleUInput.addEventListener('change', () => updateUV('number', 'u'));
        }
        if (uvScaleVInput) {
            uvScaleVInput.addEventListener('input', () => updateUV('number', 'v'));
            uvScaleVInput.addEventListener('change', () => updateUV('number', 'v'));
        }

        // 6. Header Buttons
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => Utils.showToast(this.t('global_settings'), 'info'));
        }

        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => window.open('https://github.com/w3reality/materialize-web', '_blank'));
        }

        // 7. Image Preview Modal
        const modal = document.getElementById('imagePreviewModal');
        const closePreviewBtn = document.getElementById('closePreviewBtn');

        if (modal) {
            // Close on button click
            if (closePreviewBtn) {
                closePreviewBtn.addEventListener('click', () => {
                    modal.classList.remove('show');
                    setTimeout(() => modal.style.display = 'none', 300);
                });
            }

            // Close on click outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.style.display = 'none', 300);
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    modal.classList.remove('show');
                    setTimeout(() => modal.style.display = 'none', 300);
                }
            });
        }



        this.setupTuningUI();
    }

    setupTuningUI() {
        const tuningBar = document.querySelector('.map-tuning-bar');
        const popup = document.getElementById('tuningPopup');
        const closeBtn = document.getElementById('closeTuningBtn');

        if (tuningBar) {
            tuningBar.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-tune')) {
                    const mapType = e.target.dataset.target;

                    // Toggle active state
                    document.querySelectorAll('.btn-tune').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');

                    this.openTuningPopup(mapType);
                }
            });
        }

        if (closeBtn && popup) {
            closeBtn.addEventListener('click', () => {
                this.closeTuningPopup();
            });
        }
    }

    openTuningPopup(mapType) {
        const popup = document.getElementById('tuningPopup');
        const title = document.getElementById('tuningTitle');
        const container = document.getElementById('tuningControls');
        const config = this.tuningConfig[mapType];

        if (!popup || !container || !config) return;

        // Set title
        if (title) title.textContent = `${this.getMapName(mapType)}${this.t('settings_title')}`;

        // Clear previous controls
        container.innerHTML = '';

        // Generate controls
        config.forEach(item => {
            const wrapper = document.createElement('div');
            wrapper.className = 'tuning-control';

            const currentValue = this.tuningParams[mapType][item.id];

            if (item.type === 'select') {
                // Dropdown control
                wrapper.innerHTML = `
                    <label>
                        <span>${this.t(item.label)}</span>
                    </label>
                    <select data-param="${item.id}">
                        ${item.options.map(opt => `
                            <option value="${opt.value}" ${currentValue === opt.value ? 'selected' : ''}>
                                ${opt.text}
                            </option>
                        `).join('')}
                    </select>
                `;

                const select = wrapper.querySelector('select');
                select.addEventListener('change', (e) => {
                    this.updateTuningParam(mapType, item.id, e.target.value);
                });

            } else {
                // Default Slider control
                wrapper.innerHTML = `
                    <label>
                        <span>${this.t(item.label)}</span>
                        <span class="val">${typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue}</span>
                    </label>
                    <input type="range" 
                        min="${item.min}" 
                        max="${item.max}" 
                        step="${item.step}" 
                        value="${currentValue}"
                        data-param="${item.id}">
                `;

                const input = wrapper.querySelector('input');
                const valDisplay = wrapper.querySelector('.val');

                input.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    valDisplay.textContent = val.toFixed(2); // Just for display
                    this.updateTuningParam(mapType, item.id, val);
                });
            }

            container.appendChild(wrapper);
        });

        // Add Reset Button
        const resetButton = document.createElement('button');
        resetButton.className = 'btn-text';
        resetButton.textContent = this.t('reset_defaults');
        resetButton.style.marginTop = '12px';
        resetButton.style.width = '100%';
        resetButton.addEventListener('click', () => {
            this.resetTuningParams(mapType);
            this.openTuningPopup(mapType); // Refresh UI
        });
        container.appendChild(resetButton);

        // Show popup
        popup.style.display = 'flex';
    }

    resetTuningParams(mapType) {
        // Default values mapping
        const defaultValues = {
            diffuse: { brightness: 0.0, contrast: 1.0, saturation: 1.0, hue: 0.0 },
            height: { intensity: 2.0, blur0Weight: 0.15, blur1Weight: 0.19, blur2Weight: 0.24, blur3Weight: 0.42, displacementScale: 0.0, subdivision: 128 },
            normal: { strength: 2.0, levelBlur: 0.0, step: 1.0, type: 'opengl' },
            metallic: { threshold: 0.5, smoothness: 0.1 },
            roughness: { baseRoughness: 0.3, normalInfluence: 0.5 },
            ao: { aoStrength: 1.0, aoSpread: 3.0, aoSamples: 16 },
            edge: { edgeStrength: 2.0, threshold: 0.1 }
        };

        if (defaultValues[mapType]) {
            this.tuningParams[mapType] = { ...defaultValues[mapType] };

            // Special reset for displacement
            if (mapType === 'height' && this.renderer) {
                this.renderer.setDisplacementScale(defaultValues.height.displacementScale);
                this.renderer.setSubdivision(defaultValues.height.subdivision);
            }

            this.debouncedGenerate(mapType);
            Utils.showToast(this.t('params_reset'), 'success');
        }
    }

    resetAllTuningParams() {
        const defaultValues = {
            diffuse: { brightness: 0.0, contrast: 1.0, saturation: 1.0, hue: 0.0 },
            height: { intensity: 2.0, blur0Weight: 0.15, blur1Weight: 0.19, blur2Weight: 0.24, blur3Weight: 0.42, displacementScale: 0.0, subdivision: 128 },
            normal: { strength: 2.0, levelBlur: 0.0, step: 1.0, type: 'opengl' },
            metallic: { threshold: 0.5, smoothness: 0.1 },
            roughness: { baseRoughness: 0.3, normalInfluence: 0.5 },
            ao: { aoStrength: 1.0, aoSpread: 3.0, aoSamples: 16 },
            edge: { edgeStrength: 2.0, threshold: 0.1 }
        };

        // Deep copy default values to tuningParams without triggering regeneration
        this.tuningParams = JSON.parse(JSON.stringify(defaultValues));

        // Reset renderer specific params if initialized
        if (this.renderer) {
            this.renderer.setDisplacementScale(defaultValues.height.displacementScale);
            this.renderer.setSubdivision(defaultValues.height.subdivision);
        }
    }

    closeTuningPopup() {
        const popup = document.getElementById('tuningPopup');
        if (popup) popup.style.display = 'none';

        document.querySelectorAll('.btn-tune').forEach(btn => btn.classList.remove('active'));
    }

    updateTuningParam(mapType, param, value) {
        if (this.tuningParams[mapType]) {
            this.tuningParams[mapType][param] = value;

            // Special handling for preview-only params
            if (mapType === 'height') {
                if (param === 'displacementScale' && this.renderer) {
                    this.renderer.setDisplacementScale(value);
                    return; // Skip regeneration
                }
                if (param === 'subdivision' && this.renderer) {
                    this.renderer.setSubdivision(value);
                    return; // Skip regeneration
                }
            }

            this.debouncedGenerate(mapType);
        }
    }

    async handleFileSelect(file) {
        console.log('handleFileSelect called with:', file);
        if (!file) {
            console.warn('No file provided');
            return;
        }

        // Validate file
        if (!Utils.validate.isValidImage(file)) {
            console.error('Invalid file type:', file.type);
            Utils.showToast(this.t('file_type_error'), 'error');
            return;
        }

        if (!Utils.validate.isValidSize(file)) {
            console.error('File too large:', file.size);
            Utils.showToast(this.t('file_size_error'), 'error');
            return;
        }

        Utils.showLoading(true, this.t('loading'));

        // Reset all parameters to default when loading a new image
        this.resetAllTuningParams();

        try {
            // Load image
            console.log('Loading image...');
            const img = await Utils.loadImage(file);
            console.log('Image loaded:', img.width, 'x', img.height);

            // Resize if necessary (limit to 2048x2048 for performance)
            console.log('Resizing image...');
            const canvas = Utils.resizeImage(img, 2048, 2048);
            console.log('Image resized to:', canvas.width, 'x', canvas.height);

            // Store source
            this.sourceImage = canvas;

            // Update UI
            console.log('Updating source preview...');
            this.updateSourcePreview(canvas);
            this.updateStats(img);

            // Set diffuse map automatically
            console.log('Setting diffuse map...');
            this.maps.diffuse = canvas;
            this.updateMapCanvas('diffuse', canvas);

            // Update 3D preview with diffuse map
            if (this.renderer) {
                console.log('Updating 3D renderer...');
                this.renderer.setMaterial('diffuse', canvas);
            }

            Utils.showToast(this.t('load_success'), 'success');

            // Auto generate all maps
            setTimeout(() => this.generateAllMaps(), 100);
        } catch (err) {
            console.error('Failed to load image:', err);
            Utils.showToast(this.t('load_fail'), 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    updateSourcePreview(canvas) {
        console.log('updateSourcePreview called');
        const preview = document.getElementById('sourcePreview');
        const container = document.getElementById('previewContainer');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');

        if (preview && container && uploadPlaceholder) {
            preview.src = canvas.toDataURL();
            console.log('Preview src set');

            uploadPlaceholder.style.display = 'none';
            container.style.display = 'block';

            // Force layout update
            container.style.opacity = '1';
        } else {
            console.error('Preview elements not found');
        }
    }

    updateStats(img) {
        const processSize = document.getElementById('processSize');
        if (processSize) {
            processSize.textContent = `${img.width} × ${img.height}`;
        }
    }

    clearSource() {
        this.sourceImage = null;

        const container = document.getElementById('previewContainer');
        const uploadPlaceholder = document.querySelector('.upload-placeholder');

        if (container && uploadPlaceholder) {
            container.style.display = 'none';
            uploadPlaceholder.style.display = 'block';
        }

        // Reset file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        this.clearAll();
    }

    clearAll() {
        // Clear all maps
        Object.keys(this.maps).forEach(key => {
            this.maps[key] = null;
            const canvas = document.querySelector(`.map-card[data-map-type="${key}"] canvas`);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });

        // Reset 3D renderer materials
        if (this.renderer) {
            this.renderer.resetMaterial();
        }
    }

    async generateMap(mapType, isTuning = false, silent = false) {
        if (!this.sourceImage && mapType !== 'normal' && mapType !== 'ao' && mapType !== 'edge') {
            Utils.showToast(this.t('upload_first'), 'warning');
            return;
        }

        if (!isTuning && !silent) Utils.showLoading(true, `${this.t('generating')}${this.getMapName(mapType)}...`);
        Utils.performance.start(`generate-${mapType}`);

        try {
            let result;

            switch (mapType) {
                case 'diffuse':
                    result = await this.generateDiffuseMap();
                    break;
                case 'height':
                    result = await this.generateHeightMap();
                    break;
                case 'normal':
                    result = await this.generateNormalMap();
                    break;
                case 'metallic':
                    result = await this.generateMetallicMap();
                    break;
                case 'roughness':
                    result = await this.generateRoughnessMap();
                    break;
                case 'ao':
                    result = await this.generateAOMap();
                    break;
                case 'edge':
                    result = await this.generateEdgeMap();
                    break;
                case 'combined':
                    result = await this.generateCombinedMap();
                    break;
                default:
                    throw new Error(`Unknown map type: ${mapType}`);
            }

            if (result) {
                const canvas = this.processor.toCanvas(result);
                this.maps[mapType] = canvas;
                this.updateMapCanvas(mapType, canvas);

                if (this.renderer) {
                    this.renderer.setMaterial(mapType, canvas);
                    // Ensure displacement scale matches current tuning params
                    if (mapType === 'height') {
                        this.renderer.setDisplacementScale(this.tuningParams.height.displacementScale);
                    }
                }

                const duration = Utils.performance.end(`generate-${mapType}`);
                const timeEl = document.getElementById('processTime');
                if (timeEl) timeEl.textContent = Utils.formatTime(duration);

                if (!isTuning && !silent) Utils.showToast(`${this.getMapName(mapType)}${this.t('generate_success')}`, 'success');

                // Show hint about tuning only on first successful extensive generation (e.g. normal map)
                if (!isTuning && mapType === 'normal' && !this.hasShownTuningHint) {
                    setTimeout(() => {
                        const hintEl = document.getElementById('tuningHint');
                        if (hintEl) {
                            hintEl.style.display = 'flex';
                            // Hide after 5 seconds
                            setTimeout(() => {
                                hintEl.style.opacity = '0';
                                setTimeout(() => hintEl.style.display = 'none', 500);
                            }, 5000);
                        }
                    }, 1000);
                    this.hasShownTuningHint = true;
                }
            }
        } catch (err) {
            console.error(`Failed to generate ${mapType}:`, err);
            Utils.showToast(`${this.t('generate_fail')}${this.getMapName(mapType)}`, 'error');
        } finally {
            if (!isTuning) Utils.showLoading(false);
        }
    }

    // Map Generation Methods
    async generateDiffuseMap() {
        return this.processor.processDiffuse(this.sourceImage, this.tuningParams.diffuse);
    }

    async generateHeightMap() {
        return this.processor.generateHeightMap(this.sourceImage, this.tuningParams.height);
    }

    async generateNormalMap() {
        if (!this.maps.height) {
            // Note: If tuning normal without height generated properly (first run), we might need to gen height first.
            // But usually flow is sequential or height is already there.
            if (this.sourceImage && !this.maps.height) await this.generateMap('height');
        }
        if (!this.maps.height) return null; // Should not happen if height gen succeeded

        return this.processor.generateNormalMap(this.maps.height, this.tuningParams.normal);
    }

    async generateMetallicMap() {
        return this.processor.generateMetallicMap(this.sourceImage, this.tuningParams.metallic);
    }

    async generateRoughnessMap() {
        if (!this.maps.normal) {
            if (this.sourceImage && !this.maps.normal) await this.generateMap('normal');
        }
        return this.processor.generateRoughnessMap(this.sourceImage, this.maps.normal || this.sourceImage, this.tuningParams.roughness);
    }

    async generateAOMap() {
        if (!this.maps.normal || !this.maps.height) {
            // Auto generate dependencies if missing during tuning
            if (!this.maps.height) await this.generateMap('height');
            if (!this.maps.normal) await this.generateMap('normal');
        }
        return this.processor.generateAOMap(this.maps.normal, this.maps.height, this.tuningParams.ao);
    }

    async generateEdgeMap() {
        if (!this.maps.normal) {
            if (!this.maps.normal) await this.generateMap('normal');
        }
        return this.processor.generateEdgeMap(this.maps.normal, this.tuningParams.edge);
    }

    async generateCombinedMap() {
        if (!this.maps.ao || !this.maps.roughness || !this.maps.metallic) {
            Utils.showToast(this.t('need_maps'), 'warning');
            return null;
        }
        return this.processor.combineORMMap(this.maps.ao, this.maps.roughness, this.maps.metallic);
    }

    async generateAllMaps() {
        if (!this.sourceImage) {
            Utils.showToast(this.t('upload_first'), 'warning');
            return;
        }

        const maps = ['height', 'normal', 'metallic', 'roughness', 'ao', 'edge', 'combined'];
        for (const mapType of maps) {
            await this.generateMap(mapType, false, true); // silent=true
        }

        Utils.showToast(this.t('all_maps_generated'), 'success');
    }

    async downloadAllMaps() {
        if (!this.sourceImage) {
            Utils.showToast(this.t('nothing_download'), 'warning');
            return;
        }

        Utils.showLoading(true, this.t('packaging'));

        try {
            const files = [];
            const mapTypes = Object.keys(this.maps);

            for (const type of mapTypes) {
                const canvas = this.maps[type];
                if (canvas) {
                    const blob = await Utils.canvasToBlob(canvas);
                    files.push({
                        name: `pbr_${type}.png`,
                        blob: blob
                    });
                }
            }

            if (files.length === 0) {
                Utils.showToast(this.t('no_maps'), 'warning');
                return;
            }

            const zipBlob = await Utils.createZip(files);
            if (zipBlob) {
                Utils.downloadFile(zipBlob, 'pbr_texture_maps.zip');
                Utils.showToast(this.t('download_start'), 'success');
            } else {
                Utils.showToast(this.t('package_fail'), 'error');
            }
        } catch (err) {
            console.error('Download all failed:', err);
            Utils.showToast(this.t('download_fail'), 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    downloadMap(mapType) {
        const canvas = this.maps[mapType];
        if (canvas) {
            Utils.downloadCanvas(canvas, `pbr_${mapType}.png`);
        } else {
            Utils.showToast(this.t('generate_first'), 'warning');
        }
    }

    updateMapCanvas(mapType, sourceCanvas) {
        const card = document.querySelector(`.map-card[data-map-type="${mapType}"]`);
        if (!card) return;

        const canvas = card.querySelector('canvas');
        if (canvas) {
            canvas.width = sourceCanvas.width;
            canvas.height = sourceCanvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceCanvas, 0, 0);
        }
    }

    openMapSettings(mapType) {
        Utils.showToast(`${this.getMapName(mapType)} ${this.t('global_settings')}`, 'info');
    }

    previewMap(mapType) {
        const canvas = this.maps[mapType];
        if (!canvas) {
            Utils.showToast(this.t('generate_first'), 'warning');
            return;
        }

        const modal = document.getElementById('imagePreviewModal');
        const fullPreviewImage = document.getElementById('fullPreviewImage');
        const previewTitle = document.getElementById('previewTitle');

        if (modal && fullPreviewImage) {
            fullPreviewImage.src = canvas.toDataURL();
            if (previewTitle) previewTitle.textContent = `${this.getMapName(mapType)}${this.t('preview_title')}`;

            modal.style.display = 'flex';
            // Small delay to allow display:flex to apply before adding class for transition
            setTimeout(() => modal.classList.add('show'), 10);
        } else {
            console.error('Preview modal elements not found');
            Utils.showToast(this.t('preview_fail'), 'error');
        }
    }

    editMap(mapType) {
        Utils.showToast(this.t('edit_dev'), 'info');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PBRGenApp();
});
