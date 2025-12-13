// performance-profiler.js - Performance Monitoring System

class PerformanceProfiler {
    constructor() {
        this.metrics = {};
        this.enabled = false;
        this.displayElement = null;
        this.frameTimings = [];
        this.maxFrames = 60;
    }

    init() {
        // Create performance display
        const display = document.createElement('div');
        display.id = 'perf-display';
        display.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 10px;
            border: 1px solid #0f0;
            border-radius: 5px;
            z-index: 9999;
            max-width: 300px;
            display: none;
        `;
        document.body.appendChild(display);
        this.displayElement = display;
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.displayElement) {
            this.displayElement.style.display = this.enabled ? 'block' : 'none';
        }
    }

    start(label) {
        if (!this.enabled) return;
        if (!this.metrics[label]) {
            this.metrics[label] = { total: 0, count: 0, max: 0, current: 0 };
        }
        this.metrics[label].start = performance.now();
    }

    end(label) {
        if (!this.enabled) return;
        const metric = this.metrics[label];
        if (!metric || !metric.start) return;

        const duration = performance.now() - metric.start;
        metric.current = duration;
        metric.total += duration;
        metric.count++;
        metric.max = Math.max(metric.max, duration);
        delete metric.start;
    }

    update() {
        if (!this.enabled || !this.displayElement) return;

        let html = '<div style="margin-bottom: 10px; border-bottom: 1px solid #0f0; padding-bottom: 5px;">';
        html += '<strong>⚡ PERFORMANCE PROFILER</strong><br>';
        html += '<small>Press "P" to toggle</small></div>';

        // Calculate frame time
        const frameMetric = this.metrics['frame'];
        if (frameMetric) {
            const avgFrame = frameMetric.total / frameMetric.count;
            const fps = 1000 / avgFrame;
            const color = fps > 50 ? '#0f0' : fps > 30 ? '#ff0' : '#f00';
            html += `<div style="color: ${color}; font-weight: bold;">FPS: ${fps.toFixed(1)}</div>`;
            html += `<div>Frame: ${avgFrame.toFixed(2)}ms (max: ${frameMetric.max.toFixed(2)}ms)</div><br>`;
        }

        // Object counts
        html += '<div><strong>📊 OBJECT COUNTS:</strong></div>';
        html += `<div>Projectiles: ${projectilePool?.getActiveCount() || 0}</div>`;
        html += `<div>Enemies: ${enemyPool?.getActiveCount() || 0}</div>`;
        html += `<div>Particles: ${particlePool?.getActiveCount() || 0}</div>`;
        html += `<div>Lightnings: ${lightnings?.length || 0}</div><br>`;

        // Sort metrics by average time
        const sorted = Object.entries(this.metrics)
            .filter(([key]) => key !== 'frame')
            .sort(([, a], [, b]) => (b.total / b.count) - (a.total / a.count));

        if (sorted.length > 0) {
            html += '<div><strong>⏱️ TIMING BREAKDOWN:</strong></div>';
            sorted.forEach(([label, metric]) => {
                const avg = metric.total / metric.count;
                const percent = frameMetric ? (avg / (frameMetric.total / frameMetric.count) * 100) : 0;
                const color = percent > 30 ? '#f00' : percent > 15 ? '#ff0' : '#0f0';
                html += `<div style="color: ${color};">${label}: ${avg.toFixed(2)}ms (${percent.toFixed(1)}%)</div>`;
            });
        }

        this.displayElement.innerHTML = html;

        // Reset metrics every second
        if (frameMetric && frameMetric.count > 60) {
            this.resetMetrics();
        }
    }

    resetMetrics() {
        for (const key in this.metrics) {
            this.metrics[key] = { total: 0, count: 0, max: 0, current: 0 };
        }
    }
}

// Create global profiler
const profiler = new PerformanceProfiler();
profiler.init();

// Toggle with 'P' key
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        profiler.toggle();
    }
});

// Helper function for easy profiling
window.profile = (label, fn) => {
    profiler.start(label);
    const result = fn();
    profiler.end(label);
    return result;
};