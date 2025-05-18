export class Enemy {
    constructor(x, y, speed, health) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.originalSpeed = speed; // Store original speed for slowing effects
        this.health = health;
        this.maxHealth = health;
        this.size = 20;
        
        // Random movement pattern
        this.direction = Math.random() > 0.5 ? 1 : -1; // Left or right
        this.directionChangeTime = 0;
        this.directionChangeInterval = Math.random() * 2000 + 1000; // Random time between direction changes
        
        // Visual effects
        this.angle = 0; // Tank rotation
        this.engineParticles = [];
        this.damaged = false;
        this.damageFlashTime = 0;
        
        // Health bar animation
        this.healthBarPulse = 0;
        this.showDamageNumber = false;
        this.damageNumberValue = 0;
        this.damageNumberLife = 0;
        
        // Status effects
        this.effects = {
            frozen: false,
            burning: false
        };
        this.effectDuration = 0;
        this.burnDamageTime = 0;
        this.burnDamageInterval = 500; // Apply burn damage every 500ms
        this.burnDamageValue = 0.3; // Damage per tick
        this.effectParticles = [];
        
        // Tank appearance variations
        this.tankType = this.chooseTankType();
        this.colorType = this.chooseTankColor();
        this.armorPanels = Math.random() > 0.3 ? 3 + Math.floor(Math.random() * 3) : 0; // Some tanks have armor panels
        this.gunLength = this.size * (0.7 + Math.random() * 0.5); // Random gun length
        this.turretSize = this.size * (0.5 + Math.random() * 0.3); // Random turret size
        this.hasDualGuns = this.tankType === 'assault' || (Math.random() > 0.7 && this.tankType !== 'scout');
        this.weaponFlash = { active: false, duration: 0, maxDuration: 150 };
        
        // Animation properties
        this.bobAmount = 0;
        this.bobDirection = 1;
        this.trackOffset = 0;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase for effects
    }
    
    // Select a tank type with different visual properties
    chooseTankType() {
        const types = ['standard', 'scout', 'heavy', 'assault'];
        const weights = [0.4, 0.3, 0.2, 0.1]; // Probability weights for each type
        
        // Choose a random tank type based on weights
        const rand = Math.random();
        let cumulativeWeight = 0;
        
        for (let i = 0; i < types.length; i++) {
            cumulativeWeight += weights[i];
            if (rand < cumulativeWeight) {
                return types[i];
            }
        }
        
        return 'standard'; // Fallback
    }
    
    // Select a tank color scheme based on type
    chooseTankColor() {
        const colorTypes = ['red', 'green', 'blue', 'yellow', 'purple'];
        
        // Special cases for specific tank types
        if (this.tankType === 'heavy') {
            return Math.random() > 0.5 ? 'red' : 'blue'; // Heavy tanks are usually red or blue
        } else if (this.tankType === 'scout') {
            return Math.random() > 0.5 ? 'green' : 'yellow'; // Scouts tend to be green or yellow
        } else if (this.tankType === 'assault') {
            return Math.random() > 0.5 ? 'purple' : 'red'; // Assault units are often purple or red
        }
        
        // Random color for standard tanks
        return colorTypes[Math.floor(Math.random() * colorTypes.length)];
    }
    
    update(deltaTime) {
        // Process special effects first
        this.updateEffects(deltaTime);
        
        // Calculate current speed (affected by frost)
        const currentSpeed = this.effects.frozen ? this.originalSpeed * 0.5 : this.originalSpeed;
        
        // Move downward (main direction)
        this.y += currentSpeed;
        
        // Calculate angle based on movement direction
        const targetAngle = Math.atan2(1, this.direction * 0.3); // Point in movement direction
        
        // Smooth rotation - slower when frozen
        const rotationSpeed = this.effects.frozen ? 0.05 : 0.1;
        const angleDiff = this.normalizeAngle(targetAngle - this.angle);
        this.angle += angleDiff * rotationSpeed;
        
        // Move slightly left or right for varied paths
        this.x += this.direction * (currentSpeed * 0.3);
        
        // Change direction randomly - less frequent when frozen
        this.directionChangeTime += deltaTime;
        if (this.directionChangeTime > this.directionChangeInterval) {
            this.direction *= -1; // Reverse direction
            this.directionChangeTime = 0;
            this.directionChangeInterval = Math.random() * 2000 + 1000; // Set new interval
            
            // Frozen tanks change direction less often
            if (this.effects.frozen) {
                this.directionChangeInterval *= 1.5;
            }
        }
        
        // Keep within canvas bounds
        if (this.x < this.size) {
            this.x = this.size;
            this.direction = 1;
        } else if (this.x > 800 - this.size) {
            this.x = 800 - this.size;
            this.direction = -1;
        }
        
        // Update damage flash effect
        if (this.damaged) {
            this.damageFlashTime += deltaTime;
            // Use a fixed flash duration of 150ms for all hits to avoid potential glitches
            const flashDuration = 150;
            if (this.damageFlashTime > flashDuration) {
                this.damaged = false;
                this.damageFlashTime = 0;
            }
        }
        
        // Update weapon flash effect
        if (this.weaponFlash.active) {
            this.weaponFlash.duration += deltaTime;
            if (this.weaponFlash.duration >= this.weaponFlash.maxDuration) {
                this.weaponFlash.active = false;
                this.weaponFlash.duration = 0;
            }
        }
        
        // Update health bar pulse animation
        if (this.healthBarPulse > 0) {
            this.healthBarPulse -= deltaTime / 300; // Fade over 300ms
            if (this.healthBarPulse < 0) {
                this.healthBarPulse = 0;
            }
        }
        
        // Update damage number animation
        if (this.showDamageNumber) {
            this.damageNumberLife += deltaTime;
            if (this.damageNumberLife > 800) { // Show for 800ms
                this.showDamageNumber = false;
            }
        }
        
        // Update tracks animation
        this.trackOffset += currentSpeed * 0.1;
        if (this.trackOffset > this.size / 2) {
            this.trackOffset = 0;
        }
        
        // Update bobbing animation (tank slightly bounces up and down as it moves)
        const bobSpeed = 0.1;
        const maxBob = 1.5;
        this.bobAmount += bobSpeed * this.bobDirection * (this.effects.frozen ? 0.3 : 1.0);
        
        if (Math.abs(this.bobAmount) > maxBob) {
            this.bobDirection *= -1;
            this.bobAmount = Math.sign(this.bobAmount) * maxBob;
        }
        
        // Random chance to show weapon flash for assault tanks
        if (this.tankType === 'assault' && Math.random() < 0.01 && !this.weaponFlash.active) {
            this.weaponFlash.active = true;
            this.weaponFlash.duration = 0;
        }
        
        // Add engine particles - adjust based on tank type
        let particleChance;
        
        if (this.effects.frozen) {
            particleChance = 0.05; // Lower chance when frozen
        } else if (this.tankType === 'heavy') {
            particleChance = 0.3; // Heavy tanks emit more smoke
        } else if (this.tankType === 'scout') {
            particleChance = 0.1; // Scouts emit less smoke
        } else {
            particleChance = 0.2; // Default
        }
        
        if (Math.random() < particleChance) {
            // Engine exhaust position based on tank type
            const exhaustOffset = this.tankType === 'heavy' ? this.size * 0.6 : this.size * 0.8;
            
            this.engineParticles.push({
                x: this.x - Math.sin(this.angle) * exhaustOffset,
                y: this.y - Math.cos(this.angle) * exhaustOffset,
                size: Math.random() * 3 + (this.tankType === 'heavy' ? 3 : 1),
                life: 300, // ms
                currentLife: 0,
                // Color varies based on tank type and status
                color: this.effects.frozen ? 'rgba(150, 220, 255, 0.5)' : 
                       this.tankType === 'heavy' ? 'rgba(40, 40, 40, 0.7)' : 
                       'rgba(100, 100, 100, 0.5)'
            });
        }
        
        // Update engine particles
        for (let i = this.engineParticles.length - 1; i >= 0; i--) {
            const particle = this.engineParticles[i];
            particle.currentLife += deltaTime;
            if (particle.currentLife >= particle.life) {
                this.engineParticles.splice(i, 1);
            }
        }
        
        // Update effect particles
        this.updateEffectParticles(deltaTime);
    }
    
    // Helper method to normalize angle difference
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    // New method to handle status effects
    updateEffects(deltaTime) {
        // Process new effects from projectile hits
        if (this.applyEffect) {
            if (this.applyEffect === 'frozen') {
                this.effects.frozen = true;
                this.effectDuration = 3000; // 3 seconds of slowdown
            } else if (this.applyEffect === 'burning') {
                this.effects.burning = true;
                this.effectDuration = 4000; // 4 seconds of burn damage
                this.burnDamageTime = 0; // Reset burn damage timer
            }
            
            // Clear the applied effect flag
            this.applyEffect = null;
        }
        
        // Update effect durations
        if (this.effectDuration > 0) {
            this.effectDuration -= deltaTime;
            
            // Clear effects when duration expires
            if (this.effectDuration <= 0) {
                this.effects.frozen = false;
                this.effects.burning = false;
                this.effectDuration = 0;
            }
        }
        
        // Apply burn damage over time
        if (this.effects.burning) {
            this.burnDamageTime += deltaTime;
            
            if (this.burnDamageTime >= this.burnDamageInterval) {
                // Apply burn damage
                this.takeDamage(this.burnDamageValue, 'burn');
                this.burnDamageTime -= this.burnDamageInterval; // Reset timer but keep remainder
                
                // Generate fire effect at random position on the tank
                const fireX = this.x + (Math.random() * this.size * 2 - this.size);
                const fireY = this.y + (Math.random() * this.size * 2 - this.size);
                
                // Add flame particles for burn visual effect
                for (let i = 0; i < 3; i++) {
                    this.effectParticles.push({
                        x: fireX,
                        y: fireY,
                        size: Math.random() * 6 + 3,
                        life: 500,
                        maxLife: 500,
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: -Math.random() * 0.5 - 0.2, // Flames rise upward
                        type: 'flame',
                        color: Math.random() < 0.7 ? '#ff7700' : '#ffaa00'
                    });
                }
            }
        }
        
        // Add frost particles for frozen effect
        if (this.effects.frozen && Math.random() < 0.2) {
            // Add ice crystal particles around the tank
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.size;
            this.effectParticles.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                size: Math.random() * 4 + 2,
                life: 800,
                maxLife: 800,
                vx: (Math.random() - 0.5) * 0.1,
                vy: (Math.random() - 0.5) * 0.1,
                type: 'ice',
                rotation: Math.random() * Math.PI * 2
            });
        }
    }
    
    // Method to update visual particles for effects
    updateEffectParticles(deltaTime) {
        // Update and remove expired particles
        for (let i = this.effectParticles.length - 1; i >= 0; i--) {
            const particle = this.effectParticles[i];
            
            // Update particle life
            particle.life -= deltaTime;
            if (particle.life <= 0) {
                this.effectParticles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Type-specific updates
            if (particle.type === 'flame') {
                // Flames shrink as they rise
                particle.size *= 0.97;
                // Make flames rise faster as they get smaller
                particle.vy -= 0.01;
            } else if (particle.type === 'ice') {
                // Ice crystals twinkle/rotate
                particle.rotation += deltaTime * 0.001;
            }
        }
    }
    
    // Helper method to draw rounded rectangle (for compatibility with browsers that don't support roundRect)
    drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw status effect particles behind the tank
        this.drawEffectParticles(ctx);
        
        // Translate to tank position
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Add bobbing effect to simulate tank suspension
        ctx.translate(0, this.bobAmount);
        
        // Draw engine particles
        for (const particle of this.engineParticles) {
            const lifeRatio = 1 - particle.currentLife / particle.life;
            const color = particle.color || `rgba(100, 100, 100, ${lifeRatio * 0.7})`;
            ctx.fillStyle = color;
            ctx.beginPath();
            const particleX = particle.x - this.x;
            const particleY = particle.y - this.y;
            ctx.arc(particleX, particleY, particle.size * lifeRatio, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Tank body color based on health and tank type
        let baseColor;
        
        // Set base color according to tank color type
        switch (this.colorType) {
            case 'red':
                baseColor = {r: 200, g: 40, b: 40};
                break;
            case 'green':
                baseColor = {r: 40, g: 180, b: 40};
                break;
            case 'blue':
                baseColor = {r: 40, g: 80, b: 200};
                break;
            case 'yellow':
                baseColor = {r: 200, g: 180, b: 40};
                break;
            case 'purple':
                baseColor = {r: 140, g: 40, b: 180};
                break;
            default:
                baseColor = {r: 100, g: 100, b: 100};
        }
        
        // Adjust color based on health - damaged tanks get darker
        const healthFactor = this.health / this.maxHealth;
        let r = Math.floor(baseColor.r * (0.6 + healthFactor * 0.4));
        let g = Math.floor(baseColor.g * (0.6 + healthFactor * 0.4));
        let b = Math.floor(baseColor.b * (0.6 + healthFactor * 0.4));
        
        // Apply status effect colors
        if (this.effects.frozen) {
            // Add blue tint for frozen effect
            r = Math.max(0, r - 50);
            g = Math.max(0, g - 20);
            b = Math.min(255, b + 100);
        } else if (this.effects.burning) {
            // Add red/orange tint for burning effect
            r = Math.min(255, r + 80);
            g = Math.min(255, g + 20);
            b = Math.max(0, b - 50);
        }
        
        // Flash white when damaged
        if (this.damaged) {
            r = 255;
            g = 255;
            b = 255;
        }
        
        const bodyColor = `rgb(${r}, ${g}, ${b})`;
        
        // Get tank dimensions based on type
        const tankWidth = this.getTankWidth();
        const tankHeight = this.getTankHeight();
        
        // Draw tank shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.drawRoundedRect(ctx, -tankWidth/2 + 3, -tankHeight/2 + 3, tankWidth, tankHeight, 5);
        
        // Tank body
        ctx.fillStyle = bodyColor;
        this.drawRoundedRect(ctx, -tankWidth/2, -tankHeight/2, tankWidth, tankHeight, 5);
        
        // Draw frost effect on tank if frozen
        if (this.effects.frozen) {
            this.drawFrostEffect(ctx, tankWidth, tankHeight);
        }
        
        // Draw tank details based on type
        this.drawTankDetails(ctx, bodyColor);
        
        // Draw tracks with animation
        this.drawTracks(ctx, tankWidth, tankHeight);
        
        // Draw turret and gun
        this.drawTurretAndGun(ctx);
        
        // If this is an assault type, draw the muzzle flash occasionally
        if (this.weaponFlash.active) {
            this.drawWeaponFlash(ctx);
        }
        
        ctx.restore(); // End tank drawing
        
        // Always draw health bar if enemy has health
        if (this.health > 0) {
            this.drawHealthBar(ctx);
        }
        
        // Draw damage number that floats up when taking damage
        if (this.showDamageNumber) {
            this.drawDamageNumber(ctx);
        }
    }
    
    // Get tank width based on type
    getTankWidth() {
        switch (this.tankType) {
            case 'scout':
                return this.size * 1.6; // Scouts are narrower
            case 'heavy':
                return this.size * 2.3; // Heavy tanks are wider
            case 'assault':
                return this.size * 2.0; // Assault tanks are standard width
            default: // standard
                return this.size * 2;
        }
    }
    
    // Get tank height based on type
    getTankHeight() {
        switch (this.tankType) {
            case 'scout':
                return this.size * 1.8; // Scouts are slightly longer
            case 'heavy':
                return this.size * 2.2; // Heavy tanks are larger
            case 'assault':
                return this.size * 2.0; // Assault tanks are standard size
            default: // standard
                return this.size * 2;
        }
    }
    
    // Draw track details with animation
    drawTracks(ctx, tankWidth, tankHeight) {
        // Tank track baseline
        const trackWidth = 5;
        const trackInset = this.tankType === 'scout' ? 2 : 0;
        
        // Left and right track positions
        const leftTrackX = -tankWidth/2 - trackWidth + trackInset;
        const rightTrackX = tankWidth/2 - trackInset;
        
        // Track baseline
        ctx.fillStyle = '#222';
        ctx.fillRect(leftTrackX, -tankHeight/2, trackWidth, tankHeight);
        ctx.fillRect(rightTrackX, -tankHeight/2, trackWidth, tankHeight);
        
        // Track segments with animation - simulates rotating treads
        const trackSegments = this.tankType === 'heavy' ? 8 : 6;
        const trackHeight = tankHeight / trackSegments;
        
        for (let i = 0; i < trackSegments; i++) {
            // Animate track position
            const yOffset = (i * trackHeight + this.trackOffset) % tankHeight - tankHeight/2;
            
            // Alternate segments are darker
            if (i % 2 === 0) {
                ctx.fillStyle = '#333';
                // Left track segments
                ctx.fillRect(leftTrackX, yOffset, trackWidth, trackHeight);
                // Right track segments
                ctx.fillRect(rightTrackX, yOffset, trackWidth, trackHeight);
                
                // Add track pins for heavy tanks
                if (this.tankType === 'heavy') {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(leftTrackX, yOffset + trackHeight/2 - 1, trackWidth, 2);
                    ctx.fillRect(rightTrackX, yOffset + trackHeight/2 - 1, trackWidth, 2);
                }
            }
        }
        
        // Add track wheels for detail
        const wheelCount = this.tankType === 'heavy' ? 4 : this.tankType === 'scout' ? 2 : 3;
        const wheelSpacing = tankHeight / (wheelCount + 1);
        
        for (let i = 1; i <= wheelCount; i++) {
            const wheelY = -tankHeight/2 + i * wheelSpacing;
            const wheelSize = this.tankType === 'heavy' ? 4 : 3;
            
            // Left wheel
            ctx.beginPath();
            ctx.fillStyle = '#555';
            ctx.arc(leftTrackX + trackWidth/2, wheelY, wheelSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Right wheel
            ctx.beginPath();
            ctx.arc(rightTrackX + trackWidth/2, wheelY, wheelSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw turret and gun based on tank type
    drawTurretAndGun(ctx) {
        // Turret variations by tank type
        let turretColor, turretOffset = 0;
        
        // Turret is slightly forward on scouts, centered or back on others
        if (this.tankType === 'scout') {
            turretOffset = this.size * 0.2;
        } else if (this.tankType === 'heavy') {
            turretOffset = -this.size * 0.1;
        }
        
        // Turret color is darker than body
        turretColor = '#444';
        
        // Draw turret
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(turretOffset, 0, this.turretSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add turret details based on tank type
        if (this.tankType === 'heavy') {
            // Heavy tank has armored turret
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(turretOffset, 0, this.turretSize * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            
            // Heavy tanks have a commander hatch
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(turretOffset, -this.turretSize * 0.4, this.turretSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.tankType === 'assault') {
            // Assault tank has angular turret
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(turretOffset, -this.turretSize * 0.7);
            ctx.lineTo(turretOffset + this.turretSize * 0.7, -this.turretSize * 0.2);
            ctx.lineTo(turretOffset + this.turretSize * 0.7, this.turretSize * 0.2);
            ctx.lineTo(turretOffset, this.turretSize * 0.7);
            ctx.lineTo(turretOffset - this.turretSize * 0.7, this.turretSize * 0.2);
            ctx.lineTo(turretOffset - this.turretSize * 0.7, -this.turretSize * 0.2);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw tank gun(s)
        ctx.fillStyle = '#333';
        
        if (this.hasDualGuns) {
            // Dual guns for assault or some other tanks
            const gunSpacing = this.turretSize * 0.4;
            ctx.fillRect(turretOffset, -gunSpacing - 3, this.gunLength, 5);
            ctx.fillRect(turretOffset, gunSpacing - 2, this.gunLength, 5);
            
            // Gun mantlet (reinforced base)
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(turretOffset, -gunSpacing - 4, this.turretSize * 0.3, 7);
            ctx.fillRect(turretOffset, gunSpacing - 3, this.turretSize * 0.3, 7);
        } else {
            // Single gun
            const gunWidth = this.tankType === 'heavy' ? 8 : 6;
            ctx.fillRect(turretOffset, -gunWidth/2, this.gunLength, gunWidth);
            
            // Gun mantlet (reinforced base)
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath();
            ctx.arc(turretOffset, 0, gunWidth, 0, Math.PI * 2);
            ctx.fill();
            
            // Gun barrel detail - scouts have longer, thinner guns
            if (this.tankType === 'scout') {
                ctx.fillStyle = '#222';
                ctx.fillRect(turretOffset + this.gunLength * 0.6, -2, this.gunLength * 0.4, 4);
            } else if (this.tankType === 'heavy') {
                // Heavy gun has a muzzle break
                ctx.fillStyle = '#222';
                ctx.fillRect(turretOffset + this.gunLength - 8, -5, 8, 10);
            }
        }
    }
    
    // Draw tank armor and details
    drawTankDetails(ctx, bodyColor) {
        const tankWidth = this.getTankWidth();
        const tankHeight = this.getTankHeight();
        
        // Add armor plates or details based on tank type
        if (this.armorPanels > 0) {
            // Draw armor panels
            ctx.fillStyle = '#333';
            
            // Spaced armor panels around the hull
            for (let i = 0; i < this.armorPanels; i++) {
                const panelWidth = tankWidth * 0.5 / this.armorPanels;
                const xPos = -tankWidth/2 + i * (tankWidth / this.armorPanels);
                
                if (i % 2 === 0) {
                    // Side armor panels
                    ctx.fillRect(xPos, -tankHeight/2 - 3, panelWidth, 3);
                    ctx.fillRect(xPos, tankHeight/2, panelWidth, 3);
                }
            }
        }
        
        // Type-specific details
        if (this.tankType === 'heavy') {
            // Heavy tanks have extra armor plating
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            this.drawRoundedRect(ctx, -tankWidth/2 + 4, -tankHeight/2 + 4, tankWidth - 8, tankHeight - 8, 3, false, true);
            
            // Heavy tanks have visible hatches
            ctx.fillStyle = '#333';
            ctx.fillRect(-tankWidth*0.25, -tankHeight*0.25, tankWidth*0.15, tankHeight*0.15);
            
            // Exhaust pipes
            ctx.fillStyle = '#222';
            ctx.fillRect(tankWidth*0.3, tankHeight*0.3, tankWidth*0.15, tankHeight*0.1);
            
            // Angled front armor
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(-tankWidth/2, -tankHeight/2);
            ctx.lineTo(0, -tankHeight/2 - 5);
            ctx.lineTo(tankWidth/2, -tankHeight/2);
            ctx.closePath();
            ctx.fill();
        } else if (this.tankType === 'scout') {
            // Scout tanks have streamlined bodies
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath();
            ctx.moveTo(-tankWidth/2, -tankHeight/2);
            ctx.lineTo(0, -tankHeight/2 - 8);
            ctx.lineTo(tankWidth/2, -tankHeight/2);
            ctx.closePath();
            ctx.fill();
            
            // Antenna
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -tankHeight/2);
            ctx.lineTo(-tankWidth*0.25, -tankHeight*0.8);
            ctx.stroke();
        } else if (this.tankType === 'assault') {
            // Assault tanks have reinforced frontal armor
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(-tankWidth/2 + 3, -tankHeight/2);
            ctx.lineTo(-tankWidth/4, -tankHeight/2 - 6);
            ctx.lineTo(tankWidth/4, -tankHeight/2 - 6);
            ctx.lineTo(tankWidth/2 - 3, -tankHeight/2);
            ctx.closePath();
            ctx.fill();
            
            // Assault tanks have side skirts
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(-tankWidth/2, tankHeight/2 - 5, tankWidth, 7);
        } else {
            // Standard tanks have simple details
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(-tankWidth*0.1, -tankHeight/2, tankWidth*0.2, 3);
        }
    }
    
    // Draw frost effect on frozen tanks
    drawFrostEffect(ctx, tankWidth, tankHeight) {
        // Ice crystals on tank surface
        const frostGradient = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, this.size * 1.5
        );
        frostGradient.addColorStop(0, 'rgba(160, 230, 255, 0.4)');
        frostGradient.addColorStop(1, 'rgba(160, 230, 255, 0)');
        
        ctx.fillStyle = frostGradient;
        ctx.fillRect(-tankWidth/2 - 5, -tankHeight/2 - 5, tankWidth + 10, tankHeight + 10);
        
        // Ice crystals on edges
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        
        // Draw frost spikes around the tank edges
        const spikeCount = 5;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (Math.PI * 2 / spikeCount) * i;
            const length = this.size * 0.4;
            
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(this.size, 0);
            ctx.lineTo(this.size + length * 0.7, -length * 0.3);
            ctx.lineTo(this.size + length, 0);
            ctx.lineTo(this.size + length * 0.7, length * 0.3);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
    }
    
    // Draw muzzle flash when tank is firing
    drawWeaponFlash(ctx) {
        // Calculate flash opacity based on lifetime
        const flashOpacity = 1 - (this.weaponFlash.duration / this.weaponFlash.maxDuration);
        
        // Get position for flash based on tank type
        let turretOffset = 0;
        if (this.tankType === 'scout') turretOffset = this.size * 0.2;
        else if (this.tankType === 'heavy') turretOffset = -this.size * 0.1;
        
        if (this.hasDualGuns) {
            // Flash from both guns for dual-gun tanks
            const gunSpacing = this.turretSize * 0.4;
            
            // Top gun flash
            const flashGradient1 = ctx.createRadialGradient(
                turretOffset + this.gunLength, -gunSpacing, 0,
                turretOffset + this.gunLength, -gunSpacing, 10
            );
            flashGradient1.addColorStop(0, `rgba(255, 255, 200, ${flashOpacity})`);
            flashGradient1.addColorStop(0.5, `rgba(255, 200, 100, ${flashOpacity * 0.7})`);
            flashGradient1.addColorStop(1, `rgba(255, 100, 50, ${flashOpacity * 0.1})`);
            
            ctx.fillStyle = flashGradient1;
            ctx.beginPath();
            ctx.arc(turretOffset + this.gunLength, -gunSpacing, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Bottom gun flash
            const flashGradient2 = ctx.createRadialGradient(
                turretOffset + this.gunLength, gunSpacing, 0,
                turretOffset + this.gunLength, gunSpacing, 10
            );
            flashGradient2.addColorStop(0, `rgba(255, 255, 200, ${flashOpacity})`);
            flashGradient2.addColorStop(0.5, `rgba(255, 200, 100, ${flashOpacity * 0.7})`);
            flashGradient2.addColorStop(1, `rgba(255, 100, 50, ${flashOpacity * 0.1})`);
            
            ctx.fillStyle = flashGradient2;
            ctx.beginPath();
            ctx.arc(turretOffset + this.gunLength, gunSpacing, 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Single gun flash
            const flashGradient = ctx.createRadialGradient(
                turretOffset + this.gunLength, 0, 0,
                turretOffset + this.gunLength, 0, 10
            );
            flashGradient.addColorStop(0, `rgba(255, 255, 200, ${flashOpacity})`);
            flashGradient.addColorStop(0.5, `rgba(255, 200, 100, ${flashOpacity * 0.7})`);
            flashGradient.addColorStop(1, `rgba(255, 100, 50, ${flashOpacity * 0.1})`);
            
            ctx.fillStyle = flashGradient;
            ctx.beginPath();
            ctx.arc(turretOffset + this.gunLength, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw health bar
    drawHealthBar(ctx) {
        // Calculate fixed dimensions for health bar
        const healthBarWidth = this.size * 2;
        const healthBarHeight = 8; // Increased height for better visibility
        const barPosX = Math.round(this.x - this.size); // Round to nearest pixel
        const barPosY = Math.round(this.y - this.size - 12); // Moved slightly higher
        
        // Calculate health percent accurately, clamped between 0-1
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
        
        // Draw health bar border (black outline)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
            barPosX - 1,
            barPosY - 1,
            healthBarWidth + 2,
            healthBarHeight + 2
        );
        
        // Draw health bar background (red)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; // More opaque
        ctx.fillRect(
            barPosX,
            barPosY,
            healthBarWidth,
            healthBarHeight
        );
        
        // Draw health bar foreground (gradient from yellow to green based on health)
        if (healthPercent > 0) {
            // Calculate width based on health percentage (round to avoid sub-pixel rendering)
            const greenWidth = Math.round(healthBarWidth * healthPercent);
            
            // Choose color based on health percentage
            let barColor;
            if (healthPercent < 0.3) {
                barColor = 'rgba(255, 60, 60, 0.9)'; // Low health: red
            } else if (healthPercent < 0.6) {
                barColor = 'rgba(255, 200, 60, 0.9)'; // Medium health: yellow
            } else {
                barColor = 'rgba(60, 255, 60, 0.9)'; // High health: green
            }
            
            ctx.fillStyle = barColor;
            ctx.fillRect(
                barPosX,
                barPosY,
                greenWidth,
                healthBarHeight
            );
            
            // Display health percentage as text
            const displayHealth = Math.ceil(healthPercent * 100);
            ctx.font = 'bold 8px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 2;
            ctx.fillText(
                `${displayHealth}%`, 
                barPosX + healthBarWidth / 2, 
                barPosY + healthBarHeight / 2
            );
            ctx.shadowBlur = 0;
            
            // Add pulse effect on health bar when taking damage
            if (this.healthBarPulse > 0) {
                const pulseWidth = 4;
                const pulseAlpha = this.healthBarPulse * 0.7;
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
                ctx.lineWidth = pulseWidth;
                ctx.strokeRect(
                    barPosX - pulseWidth/2,
                    barPosY - pulseWidth/2,
                    healthBarWidth + pulseWidth,
                    healthBarHeight + pulseWidth
                );
            }
        }
    }
    
    // Draw damage number
    drawDamageNumber(ctx) {
        const lifePercent = this.damageNumberLife / 800;
        const fadeIn = Math.min(1, lifePercent * 4); // Fade in quickly
        const fadeOut = 1 - Math.max(0, (lifePercent - 0.7) * 3.3); // Fade out at the end
        const alpha = Math.min(fadeIn, fadeOut);
        
        // Position above the tank, floating upward
        const numX = this.x;
        const numY = this.y - this.size - 25 - lifePercent * 20;
        
        // Draw text with outline
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Determine color based on damage type and amount
        let textColor;
        const damageType = this.damageNumberType || 'normal';
        
        if (damageType === 'burn') {
            // Burn damage is orange/red
            textColor = `rgba(255, 120, 0, ${alpha})`;
        } else if (damageType === 'frozen') {
            // Ice damage is light blue
            textColor = `rgba(120, 200, 255, ${alpha})`;
        } else if (damageType === 'splash') {
            // Splash damage is purple
            textColor = `rgba(180, 60, 255, ${alpha})`;
        } else {
            // Normal damage colors based on amount
            if (this.damageNumberValue >= 6) { // Super Shooter's double damage
                textColor = `rgba(255, 60, 60, ${alpha})`;
            } else if (this.damageNumberValue >= 2) {
                textColor = `rgba(255, 200, 60, ${alpha})`;
            } else {
                textColor = `rgba(255, 255, 255, ${alpha})`;
            }
        }
        
        // Draw text with a symbol based on damage type
        let damageText = `-${this.damageNumberValue}`;
        if (damageType === 'burn') {
            damageText = `🔥 ${damageText}`;
        } else if (damageType === 'frozen') {
            damageText = `❄️ ${damageText}`;
        } else if (damageType === 'splash') {
            damageText = `💥 ${damageText}`;
        }
        
        // Draw text outline for better readability
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText(damageText, numX, numY);
        
        // Draw text
        ctx.fillStyle = textColor;
        ctx.fillText(damageText, numX, numY);
    }
    
    takeDamage(amount, damageType = 'normal') {
        // Different damage visuals based on type
        const isDotDamage = damageType === 'burn';
        const isHeavyHit = amount >= 3 && damageType === 'normal';
        
        // Store previous health for visual effects
        const prevHealth = this.health;
        
        // Calculate actual damage amount based on type
        let actualDamage;
        if (damageType === 'normal') {
            actualDamage = isHeavyHit ? amount * 2 : amount;
        } else if (damageType === 'burn') {
            actualDamage = amount; // Burn damage is applied directly
        } else {
            actualDamage = amount; // Default
        }
        
        // Make sure we don't reduce health below zero
        if (this.health - actualDamage < 0) {
            actualDamage = this.health;
        }
        
        // Apply damage
        this.health -= actualDamage;
        
        // Force health to be a number between 0 and maxHealth
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        
        // Set damaged flag if health changed
        if (prevHealth !== this.health) {
            // Only flash for direct damage, not DoT
            if (!isDotDamage) {
                this.damaged = true;
                this.damageFlashTime = 0;
            }
            
            // Always pulse the health bar when taking damage
            this.healthBarPulse = 1.0;
            
            // Show damage number with different colors based on type
            this.showDamageNumber = true;
            this.damageNumberValue = Math.round(actualDamage * 10) / 10; // Round to 1 decimal place
            this.damageNumberLife = 0;
            this.damageNumberType = damageType; // Store type for color
            
            // Apply special effects for Super Shooter hits
            if (isHeavyHit) {
                // Add impact particle effects
                if (window.game && window.game.addImpactEffect) {
                    window.game.addImpactEffect(this.x, this.y, 20);
                }
                
                // Apply knockback effect
                const knockbackAmount = 10;
                // Calculate knockback direction based on current enemy movement
                const knockbackAngle = this.angle + Math.PI; // Opposite of movement direction
                this.x += Math.cos(knockbackAngle) * knockbackAmount;
                this.y += Math.sin(knockbackAngle) * knockbackAmount;
            }
        }
    }
    
    // Method to draw effect particles
    drawEffectParticles(ctx) {
        // Draw all effect particles
        for (const particle of this.effectParticles) {
            const lifeRatio = particle.life / particle.maxLife;
            
            if (particle.type === 'ice') {
                // Draw ice crystal
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                
                // Crystal color with opacity based on life
                ctx.fillStyle = `rgba(160, 230, 255, ${lifeRatio * 0.8})`;
                
                // Draw ice crystal shape (star/snowflake)
                ctx.beginPath();
                const points = 6; // Hexagonal crystal
                const innerRadius = particle.size * 0.4;
                const outerRadius = particle.size;
                
                for (let i = 0; i < points * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (i * Math.PI) / points;
                    
                    if (i === 0) {
                        ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    } else {
                        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    }
                }
                
                ctx.closePath();
                ctx.fill();
                
                // Add highlight
                ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.6})`;
                ctx.beginPath();
                ctx.arc(0, 0, innerRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            } else if (particle.type === 'flame') {
                // Draw flame particle
                ctx.fillStyle = `${particle.color}${Math.floor(lifeRatio * 240).toString(16).padStart(2, '0')}`;
                
                // Draw flickering flame - more rounded at top
                ctx.beginPath();
                const halfSize = particle.size / 2;
                ctx.moveTo(particle.x - halfSize, particle.y + halfSize); // Bottom left
                ctx.quadraticCurveTo(
                    particle.x, particle.y + halfSize, // Control point
                    particle.x + halfSize, particle.y + halfSize // Bottom right
                );
                ctx.quadraticCurveTo(
                    particle.x + halfSize, particle.y, // Control point
                    particle.x, particle.y - halfSize // Top
                );
                ctx.quadraticCurveTo(
                    particle.x - halfSize, particle.y, // Control point
                    particle.x - halfSize, particle.y + halfSize // Back to bottom left
                );
                ctx.fill();
                
                // Add inner glow
                const innerColor = particle.color === '#ffaa00' ? 
                    `rgba(255, 255, 200, ${lifeRatio * 0.7})` : 
                    `rgba(255, 200, 100, ${lifeRatio * 0.5})`;
                    
                ctx.fillStyle = innerColor;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // For frozen enemies, add a frost aura
        if (this.effects.frozen) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
            
            const frostGlow = ctx.createRadialGradient(
                this.x, this.y, this.size * 0.8,
                this.x, this.y, this.size * 1.3
            );
            frostGlow.addColorStop(0, 'rgba(160, 230, 255, 0.2)');
            frostGlow.addColorStop(1, 'rgba(160, 230, 255, 0)');
            
            ctx.fillStyle = frostGlow;
            ctx.fill();
            
            // Add pulsing frost ring for better visibility
            const pulseAmount = Math.sin(performance.now() * 0.002) * 0.3 + 0.7;
            const ringRadius = this.size * 1.1 * pulseAmount;
            
            ctx.strokeStyle = 'rgba(200, 240, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // For burning enemies, add a fire aura
        if (this.effects.burning) {
            const time = performance.now() * 0.003;
            const flickerAmount = Math.sin(time * 5) * 0.3 + 0.7;
            
            // Outer fire aura
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.2 * flickerAmount, 0, Math.PI * 2);
            
            const fireGlow = ctx.createRadialGradient(
                this.x, this.y, this.size * 0.5,
                this.x, this.y, this.size * 1.2 * flickerAmount
            );
            fireGlow.addColorStop(0, 'rgba(255, 100, 0, 0.2)');
            fireGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
            
            ctx.fillStyle = fireGlow;
            ctx.fill();
            
            // Add some random flame particles around the tank
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.size * (0.9 + Math.random() * 0.3);
                const posX = this.x + Math.cos(angle) * distance;
                const posY = this.y + Math.sin(angle) * distance;
                
                // Add new flame particle
                this.effectParticles.push({
                    x: posX,
                    y: posY,
                    size: Math.random() * 5 + 3,
                    life: 300 + Math.random() * 200,
                    maxLife: 300 + Math.random() * 200,
                    vx: Math.cos(angle) * 0.1,
                    vy: -Math.random() * 0.5 - 0.2, // Flames rise upward
                    type: 'flame',
                    color: Math.random() < 0.7 ? '#ff7700' : '#ffaa00'
                });
            }
        }
    }
} 