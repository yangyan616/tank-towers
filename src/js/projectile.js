export class Projectile {
    constructor(x, y, directionX, directionY, speed, damage, color, type) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.angle = Math.atan2(directionY, directionX);
        this.type = type || 'normal'; // normal, ice, flame, bomb
        
        // Determine projectile variant based on color/type if not explicitly specified
        if (this.type === 'normal') {
            if (this.damage >= 3) {
                this.isHeavy = true;
            } else if (this.color === '#42c5ff') {
                this.type = 'ice';
            } else if (this.color === '#ff7700') {
                this.type = 'flame';
            } else if (this.color === '#b042ff') {
                this.type = 'bomb';
            }
        }
        
        // Size and appearance based on projectile type
        switch (this.type) {
            case 'ice':
                this.radius = 6;
                this.glowSize = 2.5;
                this.tailLength = 18;
                this.particles = [];
                break;
            case 'flame':
                this.radius = 4;
                this.glowSize = 3;
                this.tailLength = 25;
                this.flameParticles = [];
                break;
            case 'bomb':
                this.radius = 8;
                this.glowSize = 1.5;
                this.tailLength = 10;
                this.explosionRadius = 0;
                this.explosionDuration = 0;
                this.hasExploded = false;
                break;
            default:
                // Standard or Heavy projectile
                this.radius = this.isHeavy ? 10 : 5;
                this.glowSize = this.isHeavy ? 3 : 2;
                this.tailLength = this.isHeavy ? 30 : 15;
                break;
        }
        
        // Animation values
        this.pulsePhase = 0;
        this.lifetime = 0;
    }
    
    update(deltaTime) {
        // Track lifetime
        this.lifetime += deltaTime;
        
        // Convert deltaTime to seconds
        const delta = deltaTime / 1000;
        
        // Check for explosion (bombs explode after a certain distance or on impact)
        if (this.type === 'bomb' && this.hasExploded) {
            this.explosionDuration += deltaTime;
            return; // Don't move if exploding
        }
        
        // Move projectile
        this.x += this.directionX * this.speed * delta * 60;
        this.y += this.directionY * this.speed * delta * 60;
        
        // Update visual effects based on type
        this.pulsePhase += delta * 10;
        
        // Type-specific updates
        switch (this.type) {
            case 'ice':
                // Generate ice particles
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: this.x + (Math.random() * 10 - 5),
                        y: this.y + (Math.random() * 10 - 5),
                        size: Math.random() * 3 + 1,
                        life: 400, // ms
                        maxLife: 400,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5
                    });
                }
                
                // Update ice particles
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const particle = this.particles[i];
                    particle.life -= deltaTime;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    
                    if (particle.life <= 0) {
                        this.particles.splice(i, 1);
                    }
                }
                break;
                
            case 'flame':
                // Generate flame particles
                if (Math.random() < 0.5) {
                    const angle = Math.random() * Math.PI * 2;
                    this.flameParticles.push({
                        x: this.x,
                        y: this.y,
                        vx: Math.cos(angle) * 0.5,
                        vy: Math.sin(angle) * 0.5,
                        size: Math.random() * 4 + 2,
                        life: 300,
                        maxLife: 300,
                        color: Math.random() < 0.5 ? '#ff7700' : '#ffaa00'
                    });
                }
                
                // Update flame particles
                for (let i = this.flameParticles.length - 1; i >= 0; i--) {
                    const particle = this.flameParticles[i];
                    particle.life -= deltaTime;
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.size *= 0.97; // Shrink over time
                    
                    if (particle.life <= 0) {
                        this.flameParticles.splice(i, 1);
                    }
                }
                break;
                
            case 'bomb':
                // Bomb projectiles rotate as they fly
                this.angle += delta * 5;
                break;
        }
    }
    
    draw(ctx) {
        // Handle explosion rendering for bombs
        if (this.type === 'bomb' && this.hasExploded) {
            this.drawExplosion(ctx);
            return;
        }
        
        // Draw type-specific effects first
        if (this.type === 'ice') {
            // Draw ice particles
            for (const particle of this.particles) {
                const lifeRatio = particle.life / particle.maxLife;
                ctx.fillStyle = `rgba(160, 230, 255, ${lifeRatio})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * lifeRatio, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'flame') {
            // Draw flame particles
            for (const particle of this.flameParticles) {
                const lifeRatio = particle.life / particle.maxLife;
                ctx.fillStyle = `${particle.color}${Math.floor(lifeRatio * 255).toString(16).padStart(2, '0')}`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Calculate visual pulse effects
        const pulseAmount = Math.sin(this.pulsePhase) * 0.2 + 1;
        
        // Draw tail/trail
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI); // Point in opposite direction of travel
        
        // Create gradient for tail
        const gradient = ctx.createLinearGradient(
            0, 0, 
            -this.tailLength, 0
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.color + '00'); // Transparent at end
        
        // Draw tail based on projectile type
        ctx.beginPath();
        if (this.isHeavy) {
            // Flame-like tail for Super Shooter projectiles
            const width = this.radius * 0.8;
            ctx.moveTo(0, 0);
            ctx.lineTo(-this.tailLength * 0.3, width);
            ctx.lineTo(-this.tailLength, 0);
            ctx.lineTo(-this.tailLength * 0.3, -width);
            ctx.closePath();
        } else if (this.type === 'ice') {
            // Crystalline tail for ice projectiles
            ctx.moveTo(0, 0);
            for (let i = 1; i <= 3; i++) {
                const segLength = this.tailLength / 3 * i;
                const width = this.radius * (1 - i/4);
                
                ctx.lineTo(-segLength * 0.8, width);
                ctx.lineTo(-segLength, 0);
                ctx.lineTo(-segLength * 0.8, -width);
            }
            ctx.closePath();
        } else if (this.type === 'flame') {
            // Flickering flame tail
            const flickerAmount = Math.sin(this.pulsePhase * 2) * 0.2 + 1;
            
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI - Math.PI/2;
                const length = this.tailLength * (0.7 + Math.sin(this.pulsePhase + i) * 0.3) * flickerAmount;
                const width = this.radius * (1 - i/10) * flickerAmount;
                
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(
                    -length * 0.5, Math.cos(angle) * width * 2,
                    -length, Math.sin(angle) * width
                );
            }
        } else if (this.type === 'bomb') {
            // Smoke trail for bombs
            ctx.moveTo(0, 0);
            for (let i = 0; i < 4; i++) {
                const segLength = this.tailLength * (i + 1) / 4;
                const width = this.radius * 0.5 * (1 - i/5);
                const offset = Math.sin(this.pulsePhase + i * 2) * width;
                
                ctx.lineTo(-segLength, offset);
            }
            ctx.lineTo(-this.tailLength, 0);
            ctx.lineTo(-this.tailLength, this.radius * 0.8);
            ctx.lineTo(0, this.radius * 0.5);
            ctx.closePath();
        } else {
            // Simple rectangle tail for normal projectiles
            ctx.fillRect(-this.tailLength, -this.radius * 0.5, this.tailLength, this.radius);
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
        
        // Draw outer glow
        const glowColor = this.type === 'ice' ? '#a0e0ff80' : 
                           this.type === 'flame' ? '#ff770080' : 
                           this.type === 'bomb' ? '#b042ff80' : 
                           this.color + '40';
                           
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.glowSize * pulseAmount, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();
        
        // Draw inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5 * pulseAmount, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '80';
        ctx.fill();
        
        // Draw solid core - special rendering for bomb type
        if (this.type === 'bomb') {
            // Draw bomb shape instead of circle
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            // Bomb body
            ctx.fillStyle = '#553366';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Bomb fuse
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(0, -this.radius * 1.5);
            ctx.stroke();
            
            // Fuse spark
            const sparkSize = Math.random() * 2 + 1;
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, -this.radius * 1.5, sparkSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            // Standard projectile core
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Add highlight
            ctx.beginPath();
            ctx.arc(
                this.x - this.radius * 0.3, 
                this.y - this.radius * 0.3, 
                this.radius * 0.4, 
                0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        }
    }
    
    // New method for rendering bomb explosions
    drawExplosion(ctx) {
        // Calculate explosion progress (0 to 1)
        const maxExplosionDuration = 500; // ms
        const progress = Math.min(1, this.explosionDuration / maxExplosionDuration);
        
        // Explosion grows quickly then fades
        const size = progress < 0.5 ? progress * 2 : 1;
        const opacity = progress < 0.5 ? progress * 2 : 2 * (1 - progress);
        
        // Draw explosion waves
        const maxRadius = 60; // Max explosion radius
        
        // Outer explosion wave
        ctx.beginPath();
        ctx.arc(this.x, this.y, maxRadius * size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 150, 50, ${opacity * 0.3})`;
        ctx.fill();
        
        // Middle explosion wave
        ctx.beginPath();
        ctx.arc(this.x, this.y, maxRadius * size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 50, ${opacity * 0.5})`;
        ctx.fill();
        
        // Inner explosion core
        ctx.beginPath();
        ctx.arc(this.x, this.y, maxRadius * size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 50, ${opacity * 0.8})`;
        ctx.fill();
        
        // Add some explosion particles
        if (progress < 0.2 && Math.random() < 0.4) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * maxRadius * size * 0.8;
            const particleX = this.x + Math.cos(angle) * distance;
            const particleY = this.y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 150, ${opacity * 0.9})`;
            ctx.fill();
        }
    }
    
    checkHit(enemy) {
        if (!enemy) return false;
        
        // If bomb has already exploded, use splash radius for detection
        if (this.type === 'bomb' && this.hasExploded) {
            return false; // Explosion damage is applied once at explosion time
        }
        
        // Calculate distance between projectile and enemy
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Different hit areas based on projectile type
        let hitRadius;
        switch (this.type) {
            case 'ice':
                hitRadius = this.radius * 1.1;
                break;
            case 'flame':
                hitRadius = this.radius * 0.9; // Smaller hit area but fires rapidly
                break;
            case 'bomb':
                hitRadius = this.radius * 1.1;
                break;
            default:
                hitRadius = this.isHeavy ? this.radius * 1.2 : this.radius;
                break;
        }
        
        // Check for collision
        const hit = distance < hitRadius + enemy.size;
        
        // Handle special effects on hit
        if (hit) {
            // Trigger bomb explosion
            if (this.type === 'bomb' && !this.hasExploded) {
                this.explode(enemy);
            }
            
            // Apply special effects to enemy (game will apply these effects)
            if (this.type === 'ice') {
                enemy.applyEffect = 'frozen';
                enemy.effectDuration = 3000; // 3 seconds of slowdown
            } else if (this.type === 'flame') {
                enemy.applyEffect = 'burning';
                enemy.effectDuration = 4000; // 4 seconds of burn damage
            }
        }
        
        return hit;
    }
    
    // Method to handle bomb explosion
    explode(hitEnemy) {
        this.hasExploded = true;
        this.explosionDuration = 0;
        
        // Apply splash damage to all enemies within radius
        if (window.game && window.game.enemies) {
            const splashRadius = 60; // Splash damage radius
            
            // Apply screen shake effect for explosion
            if (window.game.addScreenShake) {
                window.game.addScreenShake(15, 300);
            }
            
            // Apply impact effect for explosion
            if (window.game.addImpactEffect) {
                window.game.addImpactEffect(this.x, this.y, 30);
            }
            
            // Find all enemies in splash radius
            for (const enemy of window.game.enemies) {
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Apply splash damage with falloff based on distance
                if (distance < splashRadius + enemy.size) {
                    // Calculate damage based on distance (more damage closer to explosion)
                    const damageFactor = 1 - Math.min(1, distance / splashRadius);
                    const splashDamage = 1 + damageFactor * 1; // Splash damage between 1 and 2
                    
                    // Apply damage
                    enemy.takeDamage(splashDamage);
                    
                    // Add knockback effect
                    const knockbackAmount = damageFactor * 15;
                    const knockbackAngle = Math.atan2(dy, dx);
                    enemy.x += Math.cos(knockbackAngle) * knockbackAmount;
                    enemy.y += Math.sin(knockbackAngle) * knockbackAmount;
                }
            }
        }
    }
} 