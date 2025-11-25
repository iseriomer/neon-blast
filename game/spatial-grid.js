// spatial-grid.js - Spatial Partitioning for Fast Collision Detection
// Reduces O(n*m) to O(n) complexity!

class SpatialGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    _getKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    _getCellsForObject(obj) {
        const cells = [];
        const minX = Math.floor((obj.x - obj.radius) / this.cellSize);
        const maxX = Math.floor((obj.x + obj.radius) / this.cellSize);
        const minY = Math.floor((obj.y - obj.radius) / this.cellSize);
        const maxY = Math.floor((obj.y + obj.radius) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                cells.push(`${x},${y}`);
            }
        }
        return cells;
    }

    insert(obj) {
        const cells = this._getCellsForObject(obj);
        for (const cell of cells) {
            if (!this.grid.has(cell)) {
                this.grid.set(cell, []);
            }
            this.grid.get(cell).push(obj);
        }
    }

    getNearby(obj) {
        const cells = this._getCellsForObject(obj);
        const nearby = new Set();
        
        for (const cell of cells) {
            const objects = this.grid.get(cell);
            if (objects) {
                for (const other of objects) {
                    if (other !== obj) {
                        nearby.add(other);
                    }
                }
            }
        }
        
        return Array.from(nearby);
    }

    query(x, y, radius) {
        const obj = { x, y, radius };
        return this.getNearby(obj);
    }
}

// Create global spatial grid for enemies
const enemySpatialGrid = new SpatialGrid(150);