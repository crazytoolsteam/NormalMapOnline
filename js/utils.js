// ========================================
// Utility Functions
// ========================================

const Utils = {
    // 显示Toast通知
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // 显示/隐藏加载动画
    showLoading(show, text = '处理中...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        if (show) {
            loadingText.textContent = text;
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    },

    // 加载图片
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;

            if (file instanceof File || file instanceof Blob) {
                img.src = URL.createObjectURL(file);
            } else if (typeof file === 'string') {
                img.src = file;
            } else {
                reject(new Error('Invalid file type'));
            }
        });
    },

    // 从Canvas创建Blob
    canvasToBlob(canvas, type = 'image/png', quality = 1.0) {
        return new Promise((resolve) => {
            canvas.toBlob(resolve, type, quality);
        });
    },

    // 下载文件
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 下载Canvas
    async downloadCanvas(canvas, filename) {
        const blob = await this.canvasToBlob(canvas);
        this.downloadFile(blob, filename);
    },

    // 复制Canvas到剪贴板
    async copyCanvasToClipboard(canvas) {
        try {
            const blob = await this.canvasToBlob(canvas);
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            this.showToast('已复制到剪贴板', 'success');
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showToast('复制失败', 'error');
        }
    },

    // 调整图片大小
    resizeImage(image, maxWidth = 2048, maxHeight = 2048) {
        let width = image.width;
        let height = image.height;

        // 计算缩放比例
        const scale = Math.min(
            maxWidth / width,
            maxHeight / height,
            1 // 不放大
        );

        width = Math.floor(width * scale);
        height = Math.floor(height * scale);

        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    },

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    // 格式化时间
    formatTime(ms) {
        if (ms < 1000) return `${ms.toFixed(1)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    },

    // 创建ZIP文件（需要JSZip库）
    // 创建ZIP文件
    async createZip(files) {
        if (typeof JSZip === 'undefined') {
            console.error('JSZip library not loaded');
            this.showToast('JSZip库未加载', 'error');
            return null;
        }

        const zip = new JSZip();

        // Add files to zip
        files.forEach(file => {
            zip.file(file.name, file.blob);
        });

        // Generate zip blob
        try {
            const content = await zip.generateAsync({ type: 'blob' });
            return content;
        } catch (err) {
            console.error('Failed to generate zip:', err);
            return null;
        }
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 获取图片信息
    getImageInfo(image) {
        return {
            width: image.width,
            height: image.height,
            aspectRatio: image.width / image.height,
            megapixels: (image.width * image.height / 1000000).toFixed(2)
        };
    },

    // 检测WebGL支持
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    },

    // 获取WebGL性能等级
    getWebGLPerformanceTier() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');

            if (!gl) return 'none';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                // 简单的性能分级
                if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
                    return 'high';
                } else if (renderer.includes('Intel')) {
                    return 'medium';
                }
            }

            return 'low';
        } catch (e) {
            return 'unknown';
        }
    },

    // 本地存储操作
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage error:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage error:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage error:', e);
                return false;
            }
        }
    },

    // 颜色工具
    color: {
        // RGB to HSL
        rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            return [h * 360, s * 100, l * 100];
        },

        // HSL to RGB
        hslToRgb(h, s, l) {
            h /= 360;
            s /= 100;
            l /= 100;

            let r, g, b;

            if (s === 0) {
                r = g = b = l;
            } else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;

                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }

            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
        }
    },

    // 性能测量
    performance: {
        start(label) {
            performance.mark(`${label}-start`);
        },

        end(label) {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
            const measure = performance.getEntriesByName(label)[0];
            return measure.duration;
        }
    },

    // 验证
    validate: {
        isValidImage(file) {
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/tga'];
            return validTypes.includes(file.type);
        },

        isValidSize(file, maxSize = 50 * 1024 * 1024) { // 50MB default
            return file.size <= maxSize;
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
