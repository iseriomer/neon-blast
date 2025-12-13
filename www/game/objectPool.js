// objectPool.js - Object Pool System for Performance Optimization

class ObjectPool {
    constructor(createFn, resetFn, initialSize) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        
        this.resetFn(obj, ...args);
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        this.pool.push(...this.active);
        this.active = [];
    }

    update(updateFn) {
        // Update in reverse to safely remove items
        for (let i = this.active.length - 1; i >= 0; i--) {
            const shouldRemove = updateFn(this.active[i], i);
            if (shouldRemove) {
                this.release(this.active[i]);
            }
        }
    }

    getActive() {
        return this.active;
    }

    getActiveCount() {
        return this.active.length;
    }
}