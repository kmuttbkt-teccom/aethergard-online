export class PredictionEngine {
    currentSeq = 0;
    pendingInputs = [];
    static ERROR_THRESHOLD = 8.0; // Max allowed discrepancy before reconciliation
    /**
     * Predict player movement locally on client (0ms Latency)
     */
    predict(currentState, input, dt, platforms) {
        this.currentSeq++;
        const prevY = currentState.y;
        const moveSpeed = 210 + (currentState.stats.agi * 1.5);
        // 1. Horizontal velocity
        if (input.left) {
            currentState.vx = -moveSpeed;
        }
        else if (input.right) {
            currentState.vx = moveSpeed;
        }
        else {
            currentState.vx = 0;
        }
        // 2. Jump
        if (input.jump && currentState.isGrounded) {
            currentState.vy = -430;
            currentState.isGrounded = false;
        }
        // 3. Gravity
        currentState.vy += 980 * dt;
        if (currentState.vy > 650)
            currentState.vy = 650;
        // 4. Integrate
        currentState.x += currentState.vx * dt;
        currentState.y += currentState.vy * dt;
        // 5. Bounds
        currentState.x = Math.max(30, Math.min(2600 - 30, currentState.x));
        // 6. Platform collisions
        currentState.isGrounded = false;
        for (const p of platforms) {
            if (p.isOneWay) {
                if (currentState.x >= p.x &&
                    currentState.x <= p.x + p.w &&
                    prevY <= p.y + 4 &&
                    currentState.y >= p.y &&
                    currentState.vy >= 0) {
                    currentState.y = p.y;
                    currentState.vy = 0;
                    currentState.isGrounded = true;
                    break;
                }
            }
            else {
                if (currentState.y >= p.y && currentState.x >= p.x && currentState.x <= p.x + p.w) {
                    currentState.y = p.y;
                    currentState.vy = 0;
                    currentState.isGrounded = true;
                    break;
                }
            }
        }
        // Record in prediction buffer
        this.pendingInputs.push({
            seq: this.currentSeq,
            input: { ...input },
            dt,
            x: currentState.x,
            y: currentState.y,
            vx: currentState.vx,
            vy: currentState.vy,
            isGrounded: currentState.isGrounded
        });
        return {
            seq: this.currentSeq,
            x: currentState.x,
            y: currentState.y,
            vx: currentState.vx,
            vy: currentState.vy,
            isGrounded: currentState.isGrounded
        };
    }
    /**
     * Reconcile prediction with authoritative server snapshot
     */
    reconcile(snapshot, platforms, agi) {
        // 1. Remove all inputs that have been acknowledged by the server
        this.pendingInputs = this.pendingInputs.filter(item => item.seq > snapshot.lastAckSeq);
        // 2. Check if the server position matches our predicted history for that seq
        let reconciled = false;
        let currentX = snapshot.x;
        let currentY = snapshot.y;
        let currentVx = snapshot.vx;
        let currentVy = snapshot.vy;
        let currentGrounded = snapshot.isGrounded;
        // 3. Replay unacknowledged inputs on top of authoritative server state
        for (const item of this.pendingInputs) {
            const prevY = currentY;
            const moveSpeed = 210 + (agi * 1.5);
            if (item.input.left)
                currentVx = -moveSpeed;
            else if (item.input.right)
                currentVx = moveSpeed;
            else
                currentVx = 0;
            if (item.input.jump && currentGrounded) {
                currentVy = -430;
                currentGrounded = false;
            }
            currentVy += 980 * item.dt;
            if (currentVy > 650)
                currentVy = 650;
            currentX += currentVx * item.dt;
            currentY += currentVy * item.dt;
            currentX = Math.max(30, Math.min(2600 - 30, currentX));
            currentGrounded = false;
            for (const p of platforms) {
                if (p.isOneWay) {
                    if (currentX >= p.x && currentX <= p.x + p.w && prevY <= p.y + 4 && currentY >= p.y && currentVy >= 0) {
                        currentY = p.y;
                        currentVy = 0;
                        currentGrounded = true;
                        break;
                    }
                }
                else {
                    if (currentY >= p.y && currentX >= p.x && currentX <= p.x + p.w) {
                        currentY = p.y;
                        currentVy = 0;
                        currentGrounded = true;
                        break;
                    }
                }
            }
            item.x = currentX;
            item.y = currentY;
            item.vx = currentVx;
            item.vy = currentVy;
            item.isGrounded = currentGrounded;
            reconciled = true;
        }
        return {
            x: currentX,
            y: currentY,
            vx: currentVx,
            vy: currentVy,
            reconciled
        };
    }
    getPendingCount() {
        return this.pendingInputs.length;
    }
}
