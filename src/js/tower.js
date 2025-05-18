import { Projectile } from './projectile.js';

export class Tower {
    constructor(x, y, damage, range, fireRate, color) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.range = range;
        this.fireRate = fireRate; // milliseconds between shots
        this.color = color;
        this.size = 15;
        this.lastFireTime = 0;
        this.rotation = 0; // radians
        this.target = null;
        this.killCount = 0;
        
        // Stats for display
        this.type = this.getTowerType();
        this.level = 1;
        this.damagePerSecond = this.calculateDPS();
        this.isHovered = false;
        this.isSelected = false;
        
        // Upgrade properties
        this.upgradeLevel = 0; // 0 = base level, 1-3 = upgrade levels
        this.maxUpgradeLevel = 3;
        this.upgradeMultipliers = {
            damage: [1, 1.3, 1.7, 2.2], // Damage multiplier for each level
            range: [1, 1.15, 1.3, 1.5], // Range multiplier for each level
            fireRate: [1, 0.9, 0.8, 0.7], // FireRate multiplier (lower is faster) for each level
        };
        
        // Base stats (for upgrade calculations)
        this.baseStats = {
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate
        };
        
        // Visual enhancements
        this.baseSize = this.size + 5;
        this.barrelLength = this.size * 1.8;
        this.barrelWidth = 8;
        this.recoilDistance = 0;
        this.maxRecoil = 4;
        this.recoilRecoverySpeed = 0.2;
        this.rotationSpeed = 0.1;
        this.targetRotation = 0;
        
        // Tower details based on type
        this.setupTowerDetails();
        
        // Tower animation properties
        this.pulsePhase = Math.random() * Math.PI * 2; // Random starting phase
        this.activeEffects = [];
    }
    
    setupTowerDetails() {
        switch(this.type) {
            case "Semi Auto":
                this.barrelCount = 2;
                this.barrelSpread = 0.15;
                this.barrelWidth = 5;
                this.barrelLength = this.size * 1.6;
                this.turretDetail = "radar";
                break;
            case "Super Shooter":
                this.barrelCount = 1;
                this.barrelWidth = 12;
                this.barrelLength = this.size * 2.1;
                this.turretDetail = "heavy";
                break;
            case "Ice Tank":
                this.barrelCount = 1;
                this.barrelWidth = 8;
                this.barrelLength = this.size * 1.8;
                this.turretDetail = "ice";
                // Particle effects for ice tower
                this.particleColor = '#a0e0ff';
                this.particleChance = 0.3;
                break;
            case "Flamer":
                this.barrelCount = 3;
                this.barrelSpread = 0.1;
                this.barrelWidth = 4;
                this.barrelLength = this.size * 1.3;
                this.turretDetail = "flamer";
                // Flame effects
                this.particleColor = '#ff9d5c';
                this.particleChance = 0.5;
                break;
            case "Bomber":
                this.barrelCount = 1;
                this.barrelWidth = 10;
                this.barrelLength = this.size * 1.4;
                this.turretDetail = "bomber";
                // Bomber effects
                this.particleColor = '#d8a0ff';
                this.particleChance = 0.2;
                break;
            default: // Basic Tank
                this.barrelCount = 1;
                this.barrelSpread = 0;
                this.turretDetail = "basic";
                break;
        }
    }
    
    getTowerType() {
        // Check color to determine tower type for special towers
        if (this.color === '#42c5ff') {
            return "Ice Tank";
        } else if (this.color === '#ff7700') {
            return "Flamer";
        } else if (this.color === '#b042ff') {
            return "Bomber";
        } else if (this.fireRate <= 400) {
            return "Semi Auto";
        } else if (this.damage >= 3) {
            return "Super Shooter";
        } else {
            return "Basic Tank";
        }
    }
    
    calculateDPS() {
        return (this.damage * 1000 / this.fireRate).toFixed(1);
    }
    
    update(deltaTime, enemies) {
        // Increase the firing cooldown timer - allow it to accumulate
        this.lastFireTime += deltaTime;
        
        // Find and track the nearest enemy
        this.target = this.findTarget(enemies);
        
        // Update rotation to face target
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.targetRotation = Math.atan2(dy, dx);
            
            // Smoothly rotate towards target
            const angleDiff = this.normalizeAngle(this.targetRotation - this.rotation);
            this.rotation += angleDiff * this.rotationSpeed;
        }
        
        // Recoil recovery
        if (this.recoilDistance > 0) {
            this.recoilDistance -= this.recoilRecoverySpeed;
            if (this.recoilDistance < 0) this.recoilDistance = 0;
        }
        
        // Update active effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.life -= deltaTime;
            if (effect.life <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
    
    draw(ctx) {
        // Draw tower base
        this.drawBase(ctx);
        
        // Draw range indicator when hovering or selected
        const mouseX = window.game.mouseX || 0;
        const mouseY = window.game.mouseY || 0;
        const distToMouse = Math.sqrt(Math.pow(mouseX - this.x, 2) + Math.pow(mouseY - this.y, 2));
        
        this.isHovered = distToMouse <= this.size + 10;
        
        // Show the range circle when hovering or when selected
        if (this.isHovered || this.isSelected) {
            // Draw range circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = this.isSelected ? 'rgba(255, 255, 100, 0.5)' : 'rgba(255, 255, 255, 0.3)';
            ctx.stroke();
            ctx.fillStyle = this.isSelected ? 'rgba(255, 255, 100, 0.1)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fill();
            
            // Draw stats tooltip
            this.drawTooltip(ctx);
        }
        
        // Draw selection indicator when tower is selected
        if (this.isSelected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw tower turret
        this.drawTurret(ctx);
        
        // Draw upgrade stars
        if (this.upgradeLevel > 0) {
            this.drawUpgradeStars(ctx);
        }
        
        // Draw effects
        this.drawEffects(ctx);
    }
    
    drawBase(ctx) {
        // Create a subtle pulsing effect on the base
        const pulseAmount = Math.sin(this.pulsePhase + performance.now() * 0.002) * 0.15 + 1;
        this.pulsePhase += 0.01;
        
        // Base shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y + 3, this.baseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Base background
        const baseGradient = ctx.createRadialGradient(
            this.x, this.y, 0, 
            this.x, this.y, this.baseSize * 1.2
        );
        baseGradient.addColorStop(0, '#888');
        baseGradient.addColorStop(1, '#444');
        
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.baseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Base detail ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.baseSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Power indicator
        ctx.fillStyle = `${this.color}${Math.floor(pulseAmount * 100).toString(16)}`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawTurret(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Turret shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(2, 2, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Turret base
        const turretGradient = ctx.createRadialGradient(
            0, 0, 0, 
            0, 0, this.size
        );
        turretGradient.addColorStop(0, this.getLighterColor(this.color));
        turretGradient.addColorStop(1, this.color);
        
        ctx.fillStyle = turretGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw barrel(s)
        this.drawBarrels(ctx);
        
        // Turret detail based on type
        this.drawTurretDetail(ctx);
        
        // Highlight on turret
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawBarrels(ctx) {
        // For multiple barrels (like rapid tower)
        for (let i = 0; i < this.barrelCount; i++) {
            const angle = (i - (this.barrelCount - 1) / 2) * this.barrelSpread;
            
            ctx.save();
            ctx.rotate(angle);
            
            // Barrel shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(
                this.recoilDistance + 2, 
                -this.barrelWidth/2 + 2, 
                this.barrelLength, 
                this.barrelWidth
            );
            
            // Barrel body
            const barrelGradient = ctx.createLinearGradient(
                0, 0, 
                this.barrelLength, 0
            );
            barrelGradient.addColorStop(0, '#777');
            barrelGradient.addColorStop(1, '#444');
            
            ctx.fillStyle = barrelGradient;
            ctx.fillRect(
                this.recoilDistance, 
                -this.barrelWidth/2, 
                this.barrelLength, 
                this.barrelWidth
            );
            
            // Barrel muzzle
            ctx.fillStyle = '#333';
            ctx.fillRect(
                this.recoilDistance + this.barrelLength - 4, 
                -this.barrelWidth/2 - 2, 
                7, 
                this.barrelWidth + 4
            );
            
            // Barrel top highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(
                this.recoilDistance, 
                -this.barrelWidth/2, 
                this.barrelLength, 
                2
            );
            
            ctx.restore();
        }
    }
    
    drawTurretDetail(ctx) {
        switch (this.turretDetail) {
            case "radar":
                // Draw radar dish on top for rapid tower
                const radarSize = this.size * 0.6;
                ctx.fillStyle = '#222';
                ctx.fillRect(-radarSize/2, -radarSize/2 - 5, radarSize, radarSize/2);
                
                // Animate radar rotation
                const radarAngle = (performance.now() * 0.003) % (Math.PI * 2);
                ctx.save();
                ctx.rotate(radarAngle);
                
                // Draw radar dish
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(0, 0, radarSize/2, 0, Math.PI, true);
                ctx.fill();
                ctx.restore();
                break;
                
            case "heavy":
                // Draw reinforced armor for heavy tower
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw heavy gun support
                const supportWidth = this.size * 0.7;
                ctx.fillStyle = '#555';
                ctx.fillRect(-supportWidth/2, -5, supportWidth, 10);
                break;
                
            case "ice":
                // Draw ice crystal patterns
                const crystalSize = this.size * 0.5;
                
                // Animate ice crystal glowing
                const pulseAmount = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
                const iceColor = `rgba(150, 220, 255, ${pulseAmount})`;
                
                // Ice crystal spikes
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    ctx.save();
                    ctx.rotate(angle);
                    
                    ctx.fillStyle = iceColor;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(crystalSize * 0.5, crystalSize * 0.2);
                    ctx.lineTo(0, crystalSize);
                    ctx.lineTo(-crystalSize * 0.5, crystalSize * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.restore();
                }
                
                // Inner ice core
                ctx.fillStyle = '#d0f0ff';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case "flamer":
                // Draw flame emitter
                ctx.fillStyle = '#aa4400';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Animated flame particles
                const flameTime = performance.now() * 0.003;
                
                // Draw flame nozzles
                for (let i = 0; i < 3; i++) {
                    const angle = (i - 1) * 0.2;
                    ctx.save();
                    ctx.rotate(angle);
                    
                    // Nozzle
                    ctx.fillStyle = '#aa4400';
                    ctx.fillRect(-2, -this.size * 0.4, 4, this.size * 0.4);
                    
                    // Flame effect at nozzle tip when shooting
                    if (this.recoilDistance > 0) {
                        const flameSize = this.size * 0.3 * (Math.sin(flameTime + i) * 0.3 + 0.7);
                        const flameGradient = ctx.createRadialGradient(
                            0, -this.size * 0.5, 0,
                            0, -this.size * 0.5, flameSize
                        );
                        flameGradient.addColorStop(0, 'rgba(255, 200, 0, 0.7)');
                        flameGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                        
                        ctx.fillStyle = flameGradient;
                        ctx.beginPath();
                        ctx.arc(0, -this.size * 0.5, flameSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    ctx.restore();
                }
                
                // Fuel tank
                ctx.fillStyle = '#884400';
                ctx.beginPath();
                ctx.ellipse(0, this.size * 0.2, this.size * 0.4, this.size * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case "bomber":
                // Draw bomb launcher
                ctx.fillStyle = '#553366';
                
                // Base
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                
                // Launcher tube
                ctx.fillStyle = '#332244';
                ctx.fillRect(-this.size * 0.25, -this.size * 0.7, this.size * 0.5, this.size * 0.7);
                
                // Bomb magazine
                ctx.fillStyle = '#774488';
                ctx.beginPath();
                ctx.ellipse(0, this.size * 0.2, this.size * 0.5, this.size * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Decorative bombs
                const bombPositions = [
                    { x: -this.size * 0.2, y: this.size * 0.1 },
                    { x: this.size * 0.2, y: this.size * 0.1 },
                    { x: 0, y: this.size * 0.3 }
                ];
                
                for (const pos of bombPositions) {
                    ctx.fillStyle = '#332244';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, this.size * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Bomb fuse
                    ctx.strokeStyle = '#ffcc00';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - this.size * 0.15);
                    ctx.lineTo(pos.x, pos.y - this.size * 0.25);
                    ctx.stroke();
                    
                    // Fuse spark when firing
                    if (this.recoilDistance > 0) {
                        const sparkSize = Math.random() * 3 + 2;
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y - this.size * 0.25, sparkSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
                
            default:
                // Simple sight for basic tower
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                
                // Cross-hair
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo(5, 0);
                ctx.moveTo(0, -5);
                ctx.lineTo(0, 5);
                ctx.stroke();
                break;
        }
    }
    
    drawEffects(ctx) {
        // Draw any active effects
        for (const effect of this.activeEffects) {
            if (effect.type === 'muzzleFlash') {
                const alpha = effect.life / effect.maxLife;
                const size = effect.size * (1 - alpha * 0.5);
                
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Apply barrel spread angle for the correct barrel (for multi-barrel towers)
                if (this.barrelCount > 1 && effect.barrelIndex !== undefined) {
                    const angle = (effect.barrelIndex - (this.barrelCount - 1) / 2) * this.barrelSpread;
                    ctx.rotate(angle);
                }
                
                // Draw muzzle flash at the end of the barrel
                const muzzleX = this.barrelLength + this.recoilDistance;
                
                // Create a gradient for the muzzle flash
                const gradient = ctx.createRadialGradient(
                    muzzleX, 0, 0,
                    muzzleX, 0, size
                );
                
                // Enhanced colors for Super Shooter
                if (this.type === "Super Shooter") {
                    // More intense colors for Super Shooter
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                    gradient.addColorStop(0.3, `rgba(255, 240, 180, ${alpha * 0.9})`);
                    gradient.addColorStop(0.6, `rgba(255, 160, 50, ${alpha * 0.7})`);
                    gradient.addColorStop(1, `rgba(255, 50, 0, ${alpha * 0.2})`);
                    
                    // Draw outer glow
                    ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.2})`;
                    ctx.beginPath();
                    ctx.arc(muzzleX, 0, size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Standard colors for other towers
                    gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.8})`);
                    gradient.addColorStop(1, `rgba(255, 100, 50, ${alpha * 0.1})`);
                }
                
                // Draw main flash
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(muzzleX, 0, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add extra details for Super Shooter
                if (this.type === "Super Shooter") {
                    // Add spark effects
                    const sparkCount = 3 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < sparkCount; i++) {
                        const sparkAngle = (Math.random() * 0.5) - 0.25;
                        const sparkDist = size * (0.8 + Math.random() * 0.4);
                        const sparkSize = size * (0.2 + Math.random() * 0.2);
                        
                        ctx.fillStyle = `rgba(255, 220, 150, ${alpha * 0.9})`;
                        ctx.beginPath();
                        ctx.arc(
                            muzzleX + Math.cos(sparkAngle) * sparkDist,
                            Math.sin(sparkAngle) * sparkDist,
                            sparkSize,
                            0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                }
                
                ctx.restore();
            }
            else if (effect.type === 'upgrade') {
                // Draw upgrade particle effects
                const alpha = effect.life / effect.maxLife;
                
                ctx.save();
                ctx.translate(this.x, this.y);
                
                // Calculate particle position with outward movement
                const progress = 1 - alpha;
                const distance = effect.distance + progress * 20; // Particles move outward
                const x = Math.cos(effect.angle) * distance;
                const y = Math.sin(effect.angle) * distance;
                
                // Create glowing star particles
                const gradient = ctx.createRadialGradient(
                    x, y, 0,
                    x, y, effect.size * (1 + progress)
                );
                
                // Gold-ish color for upgrade particles
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.7})`);
                gradient.addColorStop(1, `rgba(255, 150, 0, ${alpha * 0.3})`);
                
                ctx.fillStyle = gradient;
                
                // Draw star particles
                if (Math.random() > 0.7) {
                    // Draw mini stars (25% chance)
                    const starSize = effect.size * (1 + progress);
                    this.drawStar(ctx, x, y, 5, starSize, starSize/2.5);
                } else {
                    // Draw circular particles
                    ctx.beginPath();
                    ctx.arc(x, y, effect.size * (1 + progress * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Add trail effect
                ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                const startDistance = effect.distance * 0.8;
                ctx.moveTo(
                    Math.cos(effect.angle) * startDistance,
                    Math.sin(effect.angle) * startDistance
                );
                ctx.lineTo(x, y);
                ctx.stroke();
                
                ctx.restore();
            }
        }
    }
    
    getLighterColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Lighten by 30%
        const lighterR = Math.min(255, r + 77);
        const lighterG = Math.min(255, g + 77);
        const lighterB = Math.min(255, b + 77);
        
        // Convert back to hex
        return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
    }
    
    drawTooltip(ctx) {
        const padding = 10;
        const lineHeight = 18;
        const width = 180;
        const height = 120;
        
        // Position tooltip above the tower
        let tooltipX = this.x - width / 2;
        let tooltipY = this.y - this.range - height - 20;
        
        // Keep tooltip on screen
        if (tooltipY < 10) tooltipY = this.y + this.range + 20;
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + width > ctx.canvas.width - 10) tooltipX = ctx.canvas.width - width - 10;
        
        // Draw tooltip background with a gradient
        const gradient = ctx.createLinearGradient(tooltipX, tooltipY, tooltipX, tooltipY + height);
        gradient.addColorStop(0, 'rgba(40, 40, 40, 0.9)');
        gradient.addColorStop(1, 'rgba(20, 20, 20, 0.9)');
        
        ctx.fillStyle = gradient;
        this.roundRect(ctx, tooltipX, tooltipY, width, height, 5, true);
        
        // Add a subtle border
        ctx.strokeStyle = this.color + '99';
        ctx.lineWidth = 2;
        this.roundRect(ctx, tooltipX, tooltipY, width, height, 5, false, true);
        
        // Draw tooltip content
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.type, tooltipX + padding, tooltipY + padding + 4);
        
        // Draw upgrade stars in tooltip if upgraded
        if (this.upgradeLevel > 0) {
            const starsX = tooltipX + width - padding - (this.upgradeLevel * 12);
            const starsY = tooltipY + padding + 4;
            
            // Draw stars indicating upgrade level
            for (let i = 0; i < this.upgradeLevel; i++) {
                ctx.fillStyle = '#ffcc00';
                ctx.font = '10px Arial';
                ctx.fillText('★', starsX + (i * 12), starsY);
            }
        }
        
        // Draw a separator line
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tooltipX + padding, tooltipY + padding + 10);
        ctx.lineTo(tooltipX + width - padding, tooltipY + padding + 10);
        ctx.stroke();
        
        // Draw stats
        ctx.font = '12px Arial';
        const textY = tooltipY + padding + lineHeight + 10;
        
        // Level with upgrade level
        ctx.fillText(`Level: ${this.upgradeLevel > 0 ? this.upgradeLevel + ' ★' : '1'}`, tooltipX + padding, textY);
        
        // Damage
        ctx.fillText(`Damage: ${this.damage.toFixed(1)}`, tooltipX + padding, textY + lineHeight);
        
        // Fire rate
        const fireRatePerSecond = (1000 / this.fireRate).toFixed(1);
        ctx.fillText(`Fire Rate: ${fireRatePerSecond}/sec`, tooltipX + padding, textY + lineHeight * 2);
        
        // Range
        ctx.fillText(`Range: ${this.range}`, tooltipX + padding, textY + lineHeight * 3);
        
        // DPS
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`Damage per second: ${this.damagePerSecond}`, tooltipX + padding, textY + lineHeight * 4);
        
        // Kills (if any)
        if (this.killCount > 0) {
            ctx.fillStyle = '#ff6666';
            ctx.fillText(`Enemies defeated: ${this.killCount}`, tooltipX + padding, textY + lineHeight * 5);
        }
    }
    
    // Helper method for drawing rounded rectangles
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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
    
    canFire() {
        return this.lastFireTime >= this.fireRate;
    }
    
    findTarget(enemies) {
        // Skip if no enemies
        if (!enemies || enemies.length === 0) {
            return null;
        }
        
        let nearestEnemy = null;
        let nearestDistance = this.range;
        
        // Find closest enemy in range
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.range && (nearestEnemy === null || distance < nearestDistance)) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        }
        
        return nearestEnemy;
    }
    
    // Calculate exact projectile starting position from barrel tip
    getProjectileStartPosition(barrelIndex = 0) {
        // Default to first barrel if not specified
        const angle = (barrelIndex - (this.barrelCount - 1) / 2) * this.barrelSpread;
        
        // Calculate exact position at the end of the barrel
        const totalRotation = this.rotation + angle;
        const barrelEndX = this.x + Math.cos(totalRotation) * (this.barrelLength + this.recoilDistance);
        const barrelEndY = this.y + Math.sin(totalRotation) * (this.barrelLength + this.recoilDistance);
        
        return { x: barrelEndX, y: barrelEndY };
    }
    
    fire(target) {
        if (!target) return null;
        
        // Reset firing cooldown
        this.lastFireTime = 0;
        
        // Add recoil effect - different for each tower type
        switch (this.type) {
            case "Super Shooter":
                this.recoilDistance = this.maxRecoil * 1.8;
                break;
            case "Ice Tank":
                this.recoilDistance = this.maxRecoil * 1.2;
                break;
            case "Flamer":
                this.recoilDistance = this.maxRecoil * 0.6; // Less recoil due to rapid fire
                break;
            case "Bomber":
                this.recoilDistance = this.maxRecoil * 1.5;
                break;
            default:
                this.recoilDistance = this.maxRecoil;
                break;
        }
        
        // Calculate direction to target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return null;
        
        const directionX = dx / distance;
        const directionY = dy / distance;
        
        // Get barrel tip position - different for each tower type
        let barrelLength;
        switch (this.type) {
            case "Super Shooter":
                barrelLength = 25;
                break;
            case "Ice Tank":
                barrelLength = 22;
                break;
            case "Flamer":
                barrelLength = 18;
                break;
            case "Bomber":
                barrelLength = 20;
                break;
            default:
                barrelLength = 20;
                break;
        }
        
        const barrelEndX = this.x + Math.cos(this.rotation) * barrelLength;
        const barrelEndY = this.y + Math.sin(this.rotation) * barrelLength;
        
        // Add muzzle flash effect - different for each tower type
        let flashSize, flashLife, flashColor;
        
        switch (this.type) {
            case "Super Shooter":
                flashSize = this.barrelWidth * 2.5;
                flashLife = 200;
                flashColor = "#ffaaaa";
                break;
            case "Ice Tank":
                flashSize = this.barrelWidth * 2.0;
                flashLife = 180;
                flashColor = "#aaddff";
                break;
            case "Flamer":
                flashSize = this.barrelWidth * 1.8;
                flashLife = 120;
                flashColor = "#ffaa00";
                break;
            case "Bomber":
                flashSize = this.barrelWidth * 2.2;
                flashLife = 220;
                flashColor = "#dd88ff";
                break;
            default:
                flashSize = this.barrelWidth * 1.5;
                flashLife = 150;
                flashColor = "#ffffff";
                break;
        }
        
        this.activeEffects.push({
            type: 'muzzleFlash',
            life: flashLife,
            maxLife: flashLife,
            size: flashSize,
            color: flashColor,
            barrelIndex: 0
        });
        
        // Special screen shake effects
        if (window.game) {
            switch (this.type) {
                case "Super Shooter":
                    window.game.addScreenShake(5, 100);
                    break;
                case "Bomber":
                    window.game.addScreenShake(3, 80);
                    break;
            }
        }
        
        // Create projectile with appropriate speed and type
        let projectileSpeed, projectileType;
        
        switch (this.type) {
            case "Super Shooter":
                projectileSpeed = 4; // Slower but more powerful
                projectileType = 'normal';
                break;
            case "Ice Tank":
                projectileSpeed = 4.5; // Medium speed
                projectileType = 'ice';
                break;
            case "Flamer":
                projectileSpeed = 5.5; // Fast
                projectileType = 'flame';
                break;
            case "Bomber":
                projectileSpeed = 3.5; // Slow
                projectileType = 'bomb';
                break;
            default:
                projectileSpeed = 5;
                projectileType = 'normal';
                break;
        }
        
        // Special behavior for flamer - shoots multiple flame projectiles in a cone
        if (this.type === "Flamer") {
            // Create a spread of flame projectiles
            const spreadAngle = 0.2; // Maximum spread angle (in radians)
            const spreadCount = 1; // Number of additional projectiles (not including center)
            
            // Create the main projectile
            const mainProjectile = new Projectile(
                barrelEndX,
                barrelEndY,
                directionX,
                directionY,
                projectileSpeed,
                this.damage,
                this.color,
                projectileType
            );
            
            return mainProjectile;
        } else {
            // Standard projectile for other tower types
            const projectile = new Projectile(
                barrelEndX,
                barrelEndY,
                directionX,
                directionY,
                projectileSpeed,
                this.damage,
                this.color,
                projectileType
            );
            
            return projectile;
        }
    }
    
    // New method to upgrade the tower
    upgrade() {
        if (this.upgradeLevel < this.maxUpgradeLevel) {
            this.upgradeLevel++;
            
            // Update stats based on upgrade level
            this.damage = this.baseStats.damage * this.upgradeMultipliers.damage[this.upgradeLevel];
            
            // Special case for Basic Tank range on first upgrade
            if (this.type === "Basic Tank" && this.upgradeLevel === 1) {
                this.range = 115; // Exactly 115 for first upgrade of Basic Tank
            } else {
                this.range = this.baseStats.range * this.upgradeMultipliers.range[this.upgradeLevel];
            }
            
            this.fireRate = this.baseStats.fireRate * this.upgradeMultipliers.fireRate[this.upgradeLevel];
            
            // Update DPS calculation
            this.damagePerSecond = this.calculateDPS();
            
            // Add upgrade visual effect
            this.addUpgradeEffect();
            
            return true;
        }
        return false;
    }
    
    // Add upgrade visual effect
    addUpgradeEffect() {
        // Add a visual effect for upgrading
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const distance = this.size * 1.5;
            const particleSize = 3 + Math.random() * 3;
            const life = 500 + Math.random() * 300;
            
            this.activeEffects.push({
                type: 'upgrade',
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                size: particleSize,
                color: this.color,
                life: life,
                maxLife: life,
                angle: angle,
                distance: distance
            });
        }
    }
    
    // Calculate cost to upgrade this tower
    getUpgradeCost() {
        if (this.upgradeLevel >= this.maxUpgradeLevel) {
            return null; // Max level reached
        }
        
        // Base upgrade costs per type
        const baseCosts = {
            "Basic Tank": 15,
            "Semi Auto": 30,
            "Super Shooter": 60,
            "Ice Tank": 90,
            "Flamer": 120,
            "Bomber": 180
        };
        
        // Upgrade costs increase with each level
        const levelMultiplier = [1, 2, 3]; // Cost multiplier for levels 1, 2, 3
        return baseCosts[this.type] * levelMultiplier[this.upgradeLevel];
    }
    
    // Draw stars to indicate upgrade level
    drawUpgradeStars(ctx) {
        const starSize = 8;
        const starSpacing = 15;
        const startX = this.x - ((this.upgradeLevel - 1) * starSpacing) / 2;
        const startY = this.y - this.size - 15;
        
        ctx.save();
        
        // Draw a subtle glow behind the stars
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
        
        // Draw stars based on upgrade level
        for (let i = 0; i < this.upgradeLevel; i++) {
            const starX = startX + i * starSpacing;
            
            // Draw a star
            this.drawStar(ctx, starX, startY, 5, starSize, starSize/2);
        }
        
        ctx.restore();
    }
    
    // Helper function to draw a star shape
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        
        // Fill with golden color
        const gradient = ctx.createRadialGradient(
            cx, cy, innerRadius / 2,
            cx, cy, outerRadius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ffee66');
        gradient.addColorStop(1, '#ffaa00');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add a gold border
        ctx.strokeStyle = '#aa7700';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
} 