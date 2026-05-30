/* ==========================================================================
   NEON BREAKER - 核心遊戲邏輯 (Cyberpunk / Synthwave 網頁打磚塊)
   ========================================================================== */

// 1. 音效合成器 (Web Audio API)
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('neon_breaker_muted') === 'true';
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(isMuted) {
        this.muted = isMuted;
        localStorage.setItem('neon_breaker_muted', isMuted);
    }

    createOscillator(type, freq, duration, gainStart, gainEnd = 0.001) {
        if (this.muted || !this.ctx) return null;
        
        // 確保 AudioContext 已啟動
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gainNode.gain.setValueAtTime(gainStart, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        return { osc, gainNode };
    }

    playPaddleHit() {
        this.init();
        const sound = this.createOscillator('triangle', 180, 0.12, 0.3);
        if (!sound) return;
        sound.osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
        sound.osc.start();
        sound.osc.stop(this.ctx.currentTime + 0.12);
    }

    playWallHit() {
        this.init();
        const sound = this.createOscillator('sine', 280, 0.08, 0.2);
        if (!sound) return;
        sound.osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);
        sound.osc.start();
        sound.osc.stop(this.ctx.currentTime + 0.08);
    }

    playBrickHit(hp) {
        this.init();
        // 根據磚塊耐久度發出不同的金屬擊碎聲
        const baseFreq = hp > 1 ? 400 + (hp * 120) : 320;
        const sound = this.createOscillator(hp > 1 ? 'sawtooth' : 'sine', baseFreq, 0.15, 0.25);
        if (!sound) return;
        sound.osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        sound.osc.start();
        sound.osc.stop(this.ctx.currentTime + 0.15);
    }

    playPowerup() {
        this.init();
        // 快速上升的三和弦 (Power-up 音效)
        const now = this.ctx.currentTime;
        const notes = [330, 440, 554, 660]; // A Major arpeggio
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const sound = this.createOscillator('sine', freq, 0.15, 0.15);
                if (sound) {
                    sound.osc.start();
                    sound.osc.stop(this.ctx.currentTime + 0.15);
                }
            }, index * 50);
        });
    }

    playLaser() {
        this.init();
        const sound = this.createOscillator('sawtooth', 880, 0.12, 0.15);
        if (!sound) return;
        sound.osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.12);
        sound.osc.start();
        sound.osc.stop(this.ctx.currentTime + 0.12);
    }

    playDeath() {
        this.init();
        const now = this.ctx.currentTime;
        const sound = this.createOscillator('sawtooth', 220, 0.5, 0.4);
        if (!sound) return;
        sound.osc.frequency.linearRampToValueAtTime(55, this.ctx.currentTime + 0.5);
        sound.osc.start();
        sound.osc.stop(this.ctx.currentTime + 0.5);
    }

    playLevelUp() {
        this.init();
        // 向上激昂的電子科幻大調琶音
        const now = this.ctx.currentTime;
        const notes = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5];
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const sound = this.createOscillator('sine', freq, 0.25, 0.12);
                if (sound) {
                    sound.osc.start();
                    sound.osc.stop(this.ctx.currentTime + 0.25);
                }
            }, index * 60);
        });
    }
}

// 2. 粒子效果系統 (用於磚塊爆炸與球體尾跡)
class ParticleEngine {
    constructor() {
        this.particles = [];
    }

    spawnSparks(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.06
            });
        }
    }

    spawnTrail(x, y, color) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 3 + Math.random() * 2,
            color: color,
            alpha: 0.6,
            decay: 0.04,
            gravity: 0
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            p.size *= 0.96; // 逐漸縮小

            if (p.alpha <= 0 || p.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = p.size * 2;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    clear() {
        this.particles = [];
    }
}

// 3. 全球線上排行榜管理類別 (Firebase Realtime Database，按難度分榜)
class LeaderboardManager {
    constructor() {
        this.base = 'https://game-7c865-default-rtdb.asia-southeast1.firebasedatabase.app';
    }

    _url(difficulty) {
        return `${this.base}/leaderboard_${difficulty}.json`;
    }

    // 下載指定難度排行榜（回傳陣列 or null）
    async getScores(difficulty = 'normal') {
        try {
            const response = await fetch(this._url(difficulty));
            if (!response.ok) throw new Error('無法取得線上排行榜');
            const data = await response.json();
            if (!data) return [];
            const arr = Array.isArray(data) ? data : Object.values(data);
            return arr.sort((a, b) => b.score - a.score).slice(0, 10);
        } catch (error) {
            console.error('線上排行榜下載錯誤:', error);
            return null;
        }
    }

    // 上傳分數至指定難度排行榜
    async addScore(name, score, level, difficulty = 'normal') {
        try {
            const current = await this.getScores(difficulty) || [];
            current.push({
                name: name.trim(),
                score: parseInt(score),
                level: parseInt(level),
                date: new Date().toLocaleDateString()
            });
            const updated = current.sort((a, b) => b.score - a.score).slice(0, 10);
            const response = await fetch(this._url(difficulty), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            if (!response.ok) throw new Error('資料庫上傳失敗');
            return true;
        } catch (error) {
            console.error('線上排行榜上傳錯誤:', error);
            return false;
        }
    }
}

// 4. 遊戲主類別 (NEON BREAKER ENGINE)
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 核心硬體與尺寸
        this.baseWidth = 800;
        this.baseHeight = 600;
        
        // 遊戲狀態
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.difficulty = 'normal'; // easy, normal, hard
        this.state = 'START'; // START, PLAYING, PAUSED, LEVEL_CLEAR, GAME_OVER
        this.isMuted = false;
        
        // 模組實例
        this.sound = new SoundSynth();
        this.particles = new ParticleEngine();
        this.leaderboard = new LeaderboardManager();
        
        // 遊戲實體
        this.paddle = {
            x: 400,
            y: 560,
            width: 120,
            height: 15,
            targetX: 400,
            speed: 0.25, // 插值平滑係數
            color: '#00f3ff',
            laserActive: 0, // 雷射剩餘時間 (ms)
            laserCooldown: 0,
            stickyActive: false
        };
        
        this.balls = [];
        this.bricks = [];
        this.powerups = [];
        this.lasers = [];
        this.indestructibles = []; // Indestructible walls or obstacles
        
        // 道具種類定義
        this.powerupTypes = {
            EXPAND: { label: '加寬擋板', color: '#39ff14', symbol: '↔', effect: () => this.applyExpand() },
            SHRINK: { label: '縮小擋板', color: '#bd00ff', symbol: '→←', effect: () => this.applyShrink() },
            MULTIBALL: { label: '多球分裂', color: '#00f3ff', symbol: '③', effect: () => this.applyMultiBall() },
            FIREBALL: { label: '烈焰火球', color: '#ff7f00', symbol: '🔥', effect: () => this.applyFireball() },
            LASER: { label: '雷射大砲', color: '#ff3333', symbol: '⚡', effect: () => this.applyLaser() },
            SHIELD: { label: '底部防護', color: '#bd00ff', symbol: '🛡️', effect: () => this.applyShield() },
            STICKY: { label: '磁性黏彈', color: '#ffdf00', symbol: '🧲', effect: () => this.applySticky() },
            SPEEDUP: { label: '極速暴走', color: '#ff3333', symbol: '⏩', effect: () => this.applySpeedup() }
        };
        
        // 道具持續狀態計時器
        this.activePowerups = {
            expand: 0,
            laser: 0,
            fireball: 0,
            sticky: 0
        };
        
        this.bottomShieldActive = false;
        this.screenShakeTime = 0;
        
        // 排行榜最高分
        this.highScore = parseInt(localStorage.getItem('neon_breaker_highscore')) || 0;

        // 線上排行榜顯示難度（開始畫面 tab 切換用）
        this.lbDisplayDiff = 'normal';
        
        // 綁定事件監聽器
        this.bindEvents();
        this.updateHUD();
        this.resizeCanvas();
        
        // 啟動時向雲端同步排行榜數據（只刷新開始畫面）
        this.refreshGlobalLeaderboards('start');
        
        // 啟動主繪圖循環 (僅渲染背景)
        this.tick = this.tick.bind(this);
        requestAnimationFrame(this.tick);
    }
    
    // 初始化/重設單局遊戲
    initGame() {
        this.sound.init();
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.balls = [];
        this.powerups = [];
        this.lasers = [];
        this.indestructibles = [];
        this.particles.clear();
        
        this.bottomShieldActive = false;
        this.resetPowerups();
        this.resetPaddle();
        
        this.loadLevel(this.level);
        this.spawnBall();
        
        this.state = 'PLAYING';
        this.updateHUD();
        
        // 隱藏選單螢幕
        this.hideAllScreens();
        document.getElementById('game-container').classList.add('active');
    }
    
    resetPaddle() {
        this.paddle.width = 120;
        this.paddle.x = 400;
        this.paddle.targetX = 400;
        this.paddle.laserActive = 0;
        this.paddle.stickyActive = false;
    }
    
    resetPowerups() {
        this.activePowerups.expand = 0;
        this.activePowerups.laser = 0;
        this.activePowerups.fireball = 0;
        this.activePowerups.sticky = 0;
    }
    
    // 生成一個基礎球體
    spawnBall(x = this.paddle.x, y = this.paddle.y - 12, isStuck = true) {
        // 根據難度設定初始速度 (調整為更快、更刺激的節奏)
        let baseSpeed = 8;
        if (this.difficulty === 'easy') baseSpeed = 6;
        if (this.difficulty === 'hard') baseSpeed = 10;
        
        // 每升一級球體速度提升 8%
        baseSpeed *= (1 + (this.level - 1) * 0.08);
        
        // 限制最大基礎速度避免穿透 (配合高速碰撞位置修正，上限提升至 15)
        if (baseSpeed > 15) baseSpeed = 15;
        
        const angle = -Math.PI / 3 - Math.random() * Math.PI / 3; // -60 到 -120 度
        
        this.balls.push({
            x: x,
            y: y,
            radius: 8,
            vx: Math.cos(angle) * baseSpeed,
            vy: Math.sin(angle) * baseSpeed,
            speed: baseSpeed,
            isStuck: isStuck,
            offsetFromPaddle: 0, // 當黏在擋板上時的相對 X 位移
            fireballActive: 0,   // 火球狀態剩餘時間
            color: '#00f3ff'
        });
    }
    
    // 綁定所有操作事件
    bindEvents() {
        // 滑鼠移動與點擊
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // 計算 Canvas 內對應的邏輯坐標
            const scaleX = this.baseWidth / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleX;
            
            if (mouseX >= 0 && mouseX <= this.baseWidth) {
                this.paddle.targetX = mouseX;
            }
        });
        
        // 手機觸控支援
        window.addEventListener('touchmove', (e) => {
            if (this.state !== 'PLAYING') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.baseWidth / rect.width;
            const touch = e.touches[0];
            const mouseX = (touch.clientX - rect.left) * scaleX;
            
            if (mouseX >= 0 && mouseX <= this.baseWidth) {
                this.paddle.targetX = mouseX;
            }
            e.preventDefault();
        }, { passive: false });
        
        // 滑鼠點擊（發射球體/射擊雷射）
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'PLAYING') return;
            this.handleActionClick();
        });
        
        window.addEventListener('touchstart', (e) => {
            if (this.state === 'PLAYING') {
                this.handleActionClick();
            }
        });
        
        // 鍵盤暫停、街機暱稱鍵盤直覺輸入與聚焦監聽
        window.addEventListener('keydown', (e) => {
            // A. 暫停鍵 (SPACE)
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === 'PLAYING') {
                    this.state = 'PAUSED';
                    document.getElementById('paused-overlay').classList.remove('hidden');
                } else if (this.state === 'PAUSED') {
                    this.state = 'PLAYING';
                    document.getElementById('paused-overlay').classList.add('hidden');
                    this.sound.init();
                }
                return;
            }

        });

        // 排行榜上傳按鈕點擊
        document.getElementById('submit-score-btn').addEventListener('click', () => {
            this.submitOnlineScore();
        });

        // 名稱輸入框 Enter 鍵直接送出
        document.getElementById('player-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitOnlineScore();
            }
        });
        
        // 難度選擇（同時刷新開始畫面排行榜）
        const diffBtns = document.querySelectorAll('.diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
                this.lbDisplayDiff = btn.dataset.diff;
                this.refreshGlobalLeaderboards('start');
            });
        });
        
        // 音效開關
        const soundBtn = document.getElementById('sound-toggle');
        
        // 初始化音效按鈕狀態
        if (this.sound.muted) {
            soundBtn.innerHTML = `<span class="sound-icon">🔇</span> AUDIO OFF`;
            soundBtn.style.borderColor = 'var(--neon-magenta)';
            soundBtn.style.color = 'var(--neon-magenta)';
            soundBtn.style.boxShadow = '0 0 10px rgba(255, 0, 127, 0.4)';
        }
        
        soundBtn.addEventListener('click', () => {
            const nowMuted = !this.sound.muted;
            this.sound.setMute(nowMuted);
            
            if (nowMuted) {
                soundBtn.innerHTML = `<span class="sound-icon">🔇</span> AUDIO OFF`;
                soundBtn.style.borderColor = 'var(--neon-magenta)';
                soundBtn.style.color = 'var(--neon-magenta)';
                soundBtn.style.boxShadow = '0 0 10px rgba(255, 0, 127, 0.4)';
            } else {
                this.sound.init();
                soundBtn.innerHTML = `<span class="sound-icon">🔊</span> AUDIO ON`;
                soundBtn.style.borderColor = 'var(--neon-cyan)';
                soundBtn.style.color = 'var(--neon-cyan)';
                soundBtn.style.boxShadow = 'var(--glow-cyan)';
            }
        });
        
        // 按鈕初始化
        document.getElementById('start-btn').addEventListener('click', () => this.initGame());
        document.getElementById('retry-btn').addEventListener('click', () => this.initGame());
        
        document.getElementById('next-level-btn').addEventListener('click', () => {
            this.level++;
            this.loadLevel(this.level);
            
            // 重置擋板與球體，並自動吸附在擋板上
            this.resetPaddle();
            this.balls = [];
            this.powerups = [];
            this.lasers = [];
            this.particles.clear();
            this.spawnBall(this.paddle.x, this.paddle.y - 12, true);
            
            this.state = 'PLAYING';
            this.updateHUD();
            this.hideAllScreens();
            document.getElementById('game-container').classList.add('active');
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    // 滑鼠點擊時觸發動作
    handleActionClick() {
        // 1. 釋放黏在擋板上的所有球體
        let launched = false;
        for (const ball of this.balls) {
            if (ball.isStuck) {
                ball.isStuck = false;
                // 設定一個隨機稍微偏上的向量
                const angle = -Math.PI / 3 - Math.random() * Math.PI / 3 + (ball.offsetFromPaddle / (this.paddle.width/2)) * 0.2;
                ball.vx = Math.cos(angle) * ball.speed;
                ball.vy = Math.sin(angle) * ball.speed;
                launched = true;
            }
        }
        
        // 2. 如果雷射有效，發射雷射
        if (this.activePowerups.laser > 0 && this.paddle.laserCooldown <= 0) {
            this.lasers.push({
                x: this.paddle.x - this.paddle.width / 2 + 10,
                y: this.paddle.y - 10,
                vy: -8,
                width: 3,
                height: 15,
                color: '#ff3333'
            });
            this.lasers.push({
                x: this.paddle.x + this.paddle.width / 2 - 10,
                y: this.paddle.y - 10,
                vy: -8,
                width: 3,
                height: 15,
                color: '#ff3333'
            });
            this.paddle.laserCooldown = 250; // 發射冷卻 (ms)
            this.sound.playLaser();
        }
        
        if (launched) {
            this.sound.playPaddleHit();
        }
    }
    
    // 自動適配視窗尺寸
    resizeCanvas() {
        const wrapper = this.canvas.parentElement;
        const rect = wrapper.getBoundingClientRect();
        // 保持 4:3 顯示比例
        let w = rect.width;
        let h = rect.height;
        
        if (w / h > 4 / 3) {
            w = h * (4 / 3);
        } else {
            h = w / (4 / 3);
        }
        
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
    }
    
    hideAllScreens() {
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('victory-screen').classList.remove('active');
        document.getElementById('victory-screen').classList.add('hidden');
    }
    
    // ==========================================================================
    // 關卡配置與生成
    // ==========================================================================
    loadLevel(lvl) {
        this.bricks = [];
        this.indestructibles = [];
        
        // 5 種精心設計的手工關卡
        const layouts = [
            // Level 1: 經典霓虹矩陣
            [
                ['#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f'],
                ['#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff'],
                ['#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff', '#00f3ff'],
                ['#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14', '#39ff14'],
                ['#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00', '#ffdf00']
            ],
            // Level 2: 電子防盾 (圓弧與雙血量金屬磚塊)
            // 'M' 表示金屬磚塊 (2HP)，'X' 空白，其餘為顏色
            [
                ['X', 'X', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', '#ff007f', 'X', 'X'],
                ['X', 'M', 'M', '#bd00ff', '#bd00ff', '#bd00ff', '#bd00ff', 'M', 'M', 'X'],
                ['M', '#00f3ff', '#00f3ff', 'M', 'M', 'M', 'M', '#00f3ff', '#00f3ff', 'M'],
                ['#39ff14', '#39ff14', 'X', 'X', 'X', 'X', 'X', 'X', '#39ff14', '#39ff14'],
                ['#ffdf00', 'X', 'X', 'M', 'M', 'M', 'M', 'X', 'X', '#ffdf00']
            ],
            // Level 3: 太空侵略者 (經典像素太空船)
            [
                ['X', 'X', 'M', 'X', 'X', 'X', 'X', 'M', 'X', 'X'],
                ['X', 'X', 'X', 'M', 'X', 'X', 'M', 'X', 'X', 'X'],
                ['X', 'X', 'M', 'M', 'M', 'M', 'M', 'M', 'X', 'X'],
                ['X', 'M', 'M', '#ff007f', 'M', 'M', '#ff007f', 'M', 'M', 'X'],
                ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
                ['M', 'X', 'M', 'M', 'M', 'M', 'M', 'M', 'X', 'M'],
                ['M', 'X', 'M', 'X', 'X', 'X', 'X', 'M', 'X', 'M'],
                ['X', 'X', 'X', 'M', 'M', 'M', 'M', 'X', 'X', 'X']
            ],
            // Level 4: 迷宮突圍 (加入不可摧毀的灰色障礙物)
            // 'I' 表示不可摧毀磚塊 (障礙物)
            [
                ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
                ['I', 'X', 'X', 'I', 'X', 'X', 'I', 'X', 'X', 'I'],
                ['#ff007f', '#00f3ff', '#ffdf00', '#39ff14', '#bd00ff', '#ff007f', '#00f3ff', '#ffdf00', '#39ff14', '#bd00ff'],
                ['X', 'I', 'X', 'X', 'I', 'I', 'X', 'X', 'I', 'X'],
                ['#ffdf00', '#ffdf00', '#ffdf00', 'X', 'X', 'X', 'X', '#ffdf00', '#ffdf00', '#ffdf00'],
                ['I', 'X', 'X', 'I', 'X', 'X', 'I', 'X', 'X', 'I']
            ],
            // Level 5: 無限核心 (重裝甲磚塊 3HP + 移動阻絕)
            // 'H' 表示高血量磚塊 (3HP)
            [
                ['I', 'H', 'H', 'I', 'H', 'H', 'I', 'H', 'H', 'I'],
                ['H', '#ff007f', '#ff007f', 'H', 'M', 'M', 'H', '#ff007f', '#ff007f', 'H'],
                ['H', 'M', '#00f3ff', '#00f3ff', 'H', 'H', '#00f3ff', '#00f3ff', 'M', 'H'],
                ['I', 'H', 'H', 'I', 'H', 'H', 'I', 'H', 'H', 'I'],
                ['X', 'X', 'M', 'M', 'M', 'M', 'M', 'M', 'X', 'X']
            ]
        ];
        
        let map = [];
        if (lvl <= layouts.length) {
            map = layouts[lvl - 1];
        } else {
            // Level 6+ 隨機產生矩陣，難度動態提升
            const rows = 5 + Math.min(Math.floor((lvl - 5) / 2), 3);
            const cols = 10;
            const colors = ['#ff007f', '#bd00ff', '#00f3ff', '#39ff14', '#ffdf00'];
            
            for (let r = 0; r < rows; r++) {
                const row = [];
                for (let c = 0; c < cols; c++) {
                    const rand = Math.random();
                    if (rand < 0.15) {
                        row.push('X'); // 空白
                    } else if (rand < 0.25) {
                        row.push('I'); // Indestructible
                    } else if (rand < 0.45) {
                        row.push('H'); // 3 HP
                    } else if (rand < 0.65) {
                        row.push('M'); // 2 HP
                    } else {
                        row.push(colors[Math.floor(Math.random() * colors.length)]);
                    }
                }
                map.push(row);
            }
        }
        
        // 渲染參數計算 (Canvas 寬度 800)
        // 左右留空邊界
        const paddingLeftRight = 40;
        const paddingTop = 60;
        const gap = 6;
        const columns = map[0].length;
        const brickWidth = (this.baseWidth - (paddingLeftRight * 2) - (gap * (columns - 1))) / columns;
        const brickHeight = 22;
        
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < columns; c++) {
                const val = map[r][c];
                if (val === 'X') continue;
                
                const bx = paddingLeftRight + c * (brickWidth + gap);
                const by = paddingTop + r * (brickHeight + gap);
                
                if (val === 'I') {
                    // Indestructible block
                    this.indestructibles.push({
                        x: bx,
                        y: by,
                        w: brickWidth,
                        h: brickHeight,
                        color: '#4e556b', // 科技灰
                        borderColor: '#828ba8'
                    });
                } else {
                    let hp = 1;
                    let color = val;
                    
                    if (val === 'M') {
                        hp = 2;
                        color = '#a0aec0'; // 銀色金屬
                    } else if (val === 'H') {
                        hp = 3;
                        color = '#ffd700'; // 黃金核心
                    }
                    
                    this.bricks.push({
                        x: bx,
                        y: by,
                        w: brickWidth,
                        h: brickHeight,
                        hp: hp,
                        maxHp: hp,
                        color: color,
                        scoreValue: hp * 100
                    });
                }
            }
        }
    }
    
    // 更新 HUD 文字與生命
    updateHUD() {
        document.getElementById('score-val').textContent = String(this.score).padStart(6, '0');
        document.getElementById('level-val').textContent = String(this.level).padStart(2, '0');
        document.getElementById('highscore-val').textContent = String(this.highScore).padStart(6, '0');
        
        const container = document.getElementById('lives-container');
        container.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            container.innerHTML += `<span class="life-heart">⚡</span>`;
        }
    }
    
    // ==========================================================================
    // 道具效果實作 (Powerups Effects)
    // ==========================================================================
    applyExpand() {
        this.activePowerups.expand = 10000; // 10秒
        this.paddle.width = 180;
    }
    
    applyShrink() {
        this.activePowerups.expand = 0; // 移除加寬
        this.paddle.width = 80;
        // 暫時沒有持續計時器，屬於即時削弱，5秒後恢復
        setTimeout(() => {
            if (this.state === 'PLAYING' && this.activePowerups.expand <= 0) {
                this.paddle.width = 120;
            }
        }, 6000);
    }
    
    applyMultiBall() {
        const currentCount = this.balls.length;
        if (currentCount === 0) return;
        
        // 對目前的每個球體額外分裂出 2 顆球
        const newBalls = [];
        for (const ball of this.balls) {
            if (ball.isStuck) continue;
            
            for (let i = 0; i < 2; i++) {
                const angle = Math.atan2(ball.vy, ball.vx) + (i === 0 ? 0.4 : -0.4);
                newBalls.push({
                    x: ball.x,
                    y: ball.y,
                    radius: ball.radius,
                    vx: Math.cos(angle) * ball.speed,
                    vy: Math.sin(angle) * ball.speed,
                    speed: ball.speed,
                    isStuck: false,
                    offsetFromPaddle: 0,
                    fireballActive: ball.fireballActive,
                    color: ball.fireballActive > 0 ? '#ff7f00' : '#00f3ff'
                });
            }
        }
        this.balls.push(...newBalls);
    }
    
    applyFireball() {
        this.activePowerups.fireball = 8000; // 8秒
        for (const ball of this.balls) {
            ball.color = '#ff7f00';
            ball.fireballActive = 8000;
        }
    }
    
    applyLaser() {
        this.activePowerups.laser = 8000; // 8秒雷射大砲
        this.paddle.laserCooldown = 0;
    }
    
    applyShield() {
        this.bottomShieldActive = true;
    }
    
    applySticky() {
        this.activePowerups.sticky = 12000; // 12秒磁性
        this.paddle.stickyActive = true;
    }
    
    applySpeedup() {
        // 懲罰道具：球速瞬間暴增 25%，持續 5 秒後恢復
        for (const ball of this.balls) {
            ball.vx *= 1.25;
            ball.vy *= 1.25;
            ball.speed *= 1.25;
            
            setTimeout(() => {
                if (this.state === 'PLAYING') {
                    ball.vx /= 1.25;
                    ball.vy /= 1.25;
                    ball.speed /= 1.25;
                }
            }, 5000);
        }
    }
    
    // ==========================================================================
    // 遊戲物理引擎與狀態更新
    // ==========================================================================
    update(deltaTime) {
        if (this.state !== 'PLAYING') return;
        
        // 1. 螢幕抖動時間遞減
        if (this.screenShakeTime > 0) {
            this.screenShakeTime -= deltaTime;
            if (this.screenShakeTime <= 0) {
                document.getElementById('game-container').classList.remove('screen-shake');
            }
        }
        
        // 2. 道具持續時間更新
        this.updatePowerupTimers(deltaTime);
        
        // 3. 擋板座標平滑插值 (Lerp 移動)
        const targetX = Math.max(this.paddle.width / 2, Math.min(this.baseWidth - this.paddle.width / 2, this.paddle.targetX));
        this.paddle.x += (targetX - this.paddle.x) * this.paddle.speed;
        
        // 雷射冷卻計時器
        if (this.paddle.laserCooldown > 0) {
            this.paddle.laserCooldown -= deltaTime;
        }
        
        // 4. 雷射彈體物理
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.y += laser.vy;
            
            // 粒子尾跡
            if (Math.random() < 0.4) {
                this.particles.spawnTrail(laser.x, laser.y, '#ff3333');
            }
            
            // 移出畫布
            if (laser.y < 0) {
                this.lasers.splice(i, 1);
                continue;
            }
            
            // 雷射與磚塊碰撞
            let hit = false;
            for (let j = this.bricks.length - 1; j >= 0; j--) {
                const brick = this.bricks[j];
                if (laser.x >= brick.x && laser.x <= brick.x + brick.w &&
                    laser.y >= brick.y && laser.y <= brick.y + brick.h) {
                    
                    hit = true;
                    this.damageBrick(j, brick);
                    break;
                }
            }
            
            if (hit) {
                this.lasers.splice(i, 1);
            }
        }
        
        // 5. 球體物理更新
        this.updateBalls();
        
        // 6. 道具掉落物更新
        this.updateFallingPowerups();
        
        // 7. 粒子引擎更新
        this.particles.update();
        
        // 8. 檢查關卡清除條件
        if (this.bricks.length === 0) {
            this.triggerLevelClear();
        }
    }
    
    updatePowerupTimers(deltaTime) {
        // 更新計時
        for (const key in this.activePowerups) {
            if (this.activePowerups[key] > 0) {
                this.activePowerups[key] -= deltaTime;
                if (this.activePowerups[key] <= 0) {
                    this.activePowerups[key] = 0;
                    
                    // 效果結束回復
                    if (key === 'expand') this.paddle.width = 120;
                    if (key === 'sticky') this.paddle.stickyActive = false;
                }
            }
        }
        
        // 繪製與渲染 HUD 道具指示器
        const container = document.getElementById('powerup-hud');
        container.innerHTML = '';
        
        for (const typeKey in this.powerupTypes) {
            const stateKey = typeKey.toLowerCase();
            if (this.activePowerups[stateKey] > 0) {
                const type = this.powerupTypes[typeKey];
                const timeLeft = this.activePowerups[stateKey];
                const maxTime = stateKey === 'fireball' || stateKey === 'laser' ? 8000 : (stateKey === 'sticky' ? 12000 : 10000);
                const percent = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
                
                container.innerHTML += `
                    <div class="powerup-pill" style="--p-color: ${type.color}">
                        <span>${type.symbol} ${type.label}</span>
                        <div class="powerup-progress">
                            <div class="powerup-progress-bar" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        // 底部安全防禦網 (盾牌)
        if (this.bottomShieldActive) {
            container.innerHTML += `
                <div class="powerup-pill" style="--p-color: #bd00ff">
                    <span>🛡️ 底部電盾 已啟用</span>
                </div>
            `;
        }
    }
    
    updateBalls() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            
            // 磁性吸附模式
            if (ball.isStuck) {
                ball.x = this.paddle.x + ball.offsetFromPaddle;
                ball.y = this.paddle.y - 12 - ball.radius;
                continue;
            }
            
            // 球體移動
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // 火球與標準粒子尾跡
            if (ball.fireballActive > 0) {
                ball.fireballActive -= 16.67; // 約等於 1 幀毫秒
                if (ball.fireballActive <= 0) {
                    ball.color = '#00f3ff';
                }
                this.particles.spawnTrail(ball.x, ball.y, '#ff7f00');
            } else {
                if (Math.random() < 0.5) {
                    this.particles.spawnTrail(ball.x, ball.y, 'rgba(0, 243, 255, 0.4)');
                }
            }
            
            // A. 與牆壁邊界的碰撞
            // 左右牆壁反彈
            if (ball.x - ball.radius <= 0) {
                ball.x = ball.radius;
                ball.vx = -ball.vx;
                this.sound.playWallHit();
            } else if (ball.x + ball.radius >= this.baseWidth) {
                ball.x = this.baseWidth - ball.radius;
                ball.vx = -ball.vx;
                this.sound.playWallHit();
            }
            
            // 天花板反彈
            if (ball.y - ball.radius <= 0) {
                ball.y = ball.radius;
                ball.vy = -ball.vy;
                this.sound.playWallHit();
            }
            
            // B. 掉出底部的判斷
            if (ball.y + ball.radius >= this.baseHeight) {
                // 如果底部防護電盾存在，反彈並消耗
                if (this.bottomShieldActive) {
                    ball.y = this.baseHeight - 15 - ball.radius;
                    ball.vy = -Math.abs(ball.vy);
                    this.bottomShieldActive = false;
                    this.sound.playPaddleHit();
                    this.triggerScreenShake(150);
                    
                    // 生成華麗電網粉碎粒子
                    for (let px = 0; px < this.baseWidth; px += 20) {
                        this.particles.spawnSparks(px, this.baseHeight - 10, '#bd00ff', 1);
                    }
                    continue;
                }
                
                // 移除這個球
                this.balls.splice(i, 1);
                
                // 檢查是否還有其他存活球體
                if (this.balls.length === 0) {
                    this.handleLifeLoss();
                }
                continue;
            }
            
            // C. 與 Indestructible 障礙物的碰撞 (不可摧毀磚塊)
            for (const obs of this.indestructibles) {
                this.checkBallBoxCollision(ball, obs, true); // true 代表不造成傷害只反彈
            }
            
            // D. 與可破壞磚塊的碰撞
            for (let j = this.bricks.length - 1; j >= 0; j--) {
                const brick = this.bricks[j];
                
                if (this.checkBallBoxCollision(ball, brick, false)) {
                    // 如果不是火球模式，球體才反彈
                    if (!(ball.fireballActive > 0)) {
                        // 碰撞判定中已在 checkBallBoxCollision 調整速度方向
                    }
                    
                    // 扣除磚塊 HP
                    this.damageBrick(j, brick);
                    break; // 每次只與一顆磚塊碰撞，防止穿透
                }
            }
            
            // E. 與擋板的碰撞
            const paddleTop = this.paddle.y - this.paddle.height / 2;
            const paddleBottom = this.paddle.y + this.paddle.height / 2;
            const paddleLeft = this.paddle.x - this.paddle.width / 2;
            const paddleRight = this.paddle.x + this.paddle.width / 2;
            
            if (ball.y + ball.radius >= paddleTop &&
                ball.y - ball.radius <= paddleBottom &&
                ball.x + ball.radius >= paddleLeft &&
                ball.x - ball.radius <= paddleRight) {
                
                // 接球成功！
                // 修正球體高度防止嵌入
                ball.y = paddleTop - ball.radius;
                
                // 磁性黏彈模式：球體黏附在擋板上
                if (this.paddle.stickyActive) {
                    ball.isStuck = true;
                    ball.offsetFromPaddle = ball.x - this.paddle.x;
                    this.sound.playPaddleHit();
                    continue;
                }
                
                // 計算擊中點在擋板上的比例 (從 -1.0 到 1.0)
                const hitPoint = (ball.x - this.paddle.x) / (this.paddle.width / 2);
                
                // 動態調整反彈角度 (最大反彈角約 75 度，防禦正中央彈得直，兩側彈得扁平)
                const maxReflectionAngle = (70 * Math.PI) / 180;
                const angle = hitPoint * maxReflectionAngle - Math.PI / 2;
                
                ball.vx = Math.cos(angle) * ball.speed;
                ball.vy = Math.sin(angle) * ball.speed;
                
                // 微調確保向上彈射
                if (ball.vy > -1) ball.vy = -1;
                
                this.sound.playPaddleHit();
                
                // 擋板霓虹粒子效果
                this.particles.spawnSparks(ball.x, paddleTop, '#00f3ff', 5);
            }
        }
    }
    
    // 圓形與 AABB 矩形盒子的碰撞與位置修正
    checkBallBoxCollision(ball, box, isIndestructible = false) {
        // 尋找矩形上最接近圓心的點
        const closestX = Math.max(box.x, Math.min(ball.x, box.x + box.w));
        const closestY = Math.max(box.y, Math.min(ball.y, box.y + box.h));
        
        // 計算圓心到此最接近點的距離
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        if (distance < ball.radius) {
            // 如果是火球模式，且是可破壞的磚塊，不進行反彈，直接穿透
            if (ball.fireballActive > 0 && !isIndestructible) {
                return true;
            }
            
            // 決定碰撞方向並彈回 (邊緣修正)
            // 比較球心相對於最接近點的投影差
            const overlap = ball.radius - distance;
            
            // 避免除以 0
            const dx = distX / (distance || 1);
            const dy = distY / (distance || 1);
            
            // 修正位置防止嵌入物體內部
            ball.x += dx * overlap;
            ball.y += dy * overlap;
            
            // 反彈方向判定
            if (Math.abs(dx) > Math.abs(dy)) {
                ball.vx = Math.abs(ball.vx) * (dx > 0 ? 1 : -1);
            } else {
                ball.vy = Math.abs(ball.vy) * (dy > 0 ? 1 : -1);
            }
            
            return true;
        }
        
        return false;
    }
    
    // 扣減磚塊生命值
    damageBrick(index, brick) {
        brick.hp--;
        
        if (brick.hp <= 0) {
            // 分數加成
            this.score += brick.scoreValue;
            this.updateHUD();
            
            // 觸起金屬/普通霓虹粒子爆炸
            const sparkColor = brick.maxHp > 1 ? (brick.maxHp === 3 ? '#ffd700' : '#d2d6dc') : brick.color;
            this.particles.spawnSparks(brick.x + brick.w / 2, brick.y + brick.h / 2, sparkColor, 15);
            
            this.sound.playBrickHit(0);
            
            // 隨機機率掉落道具
            this.trySpawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
            
            // 移出陣列
            this.bricks.splice(index, 1);
        } else {
            // 碎裂受損粒子 (黃色/白色火花)
            this.particles.spawnSparks(brick.x + brick.w / 2, brick.y + brick.h / 2, '#fff', 4);
            
            // 改變顯示顏色以提示損壞
            if (brick.hp === 2) brick.color = '#c5a059'; // 黃金核心受損變暗
            if (brick.hp === 1) {
                brick.color = '#ff5f9e'; // 2HP 金屬磚快損毀變粉紅
            }
            
            this.sound.playBrickHit(brick.hp);
            this.triggerScreenShake(80);
        }
    }
    
    // 嘗試生成隨機道具
    trySpawnPowerup(x, y) {
        // 掉落機率 (簡單 18%, 一般 15%, 困難 10%)
        let chance = 0.15;
        if (this.difficulty === 'easy') chance = 0.18;
        if (this.difficulty === 'hard') chance = 0.10;
        
        if (Math.random() > chance) return;
        
        // 道具池選擇權重 (難度越高，出現負面道具機率越高)
        const keys = Object.keys(this.powerupTypes);
        let selectedKey = 'MULTIBALL';
        
        const rand = Math.random();
        if (this.difficulty === 'hard') {
            // 困難難度下提高 SHRINK (縮小擋板) 與 SPEEDUP (極速暴走) 機率
            if (rand < 0.25) selectedKey = 'SHRINK';
            else if (rand < 0.45) selectedKey = 'SPEEDUP';
            else if (rand < 0.60) selectedKey = 'MULTIBALL';
            else if (rand < 0.75) selectedKey = 'EXPAND';
            else if (rand < 0.85) selectedKey = 'STICKY';
            else if (rand < 0.93) selectedKey = 'FIREBALL';
            else selectedKey = 'LASER';
        } else {
            // 簡單或一般難度 (正面道具居多)
            if (rand < 0.20) selectedKey = 'MULTIBALL';
            else if (rand < 0.40) selectedKey = 'EXPAND';
            else if (rand < 0.55) selectedKey = 'STICKY';
            else if (rand < 0.70) selectedKey = 'SHIELD';
            else if (rand < 0.82) selectedKey = 'FIREBALL';
            else if (rand < 0.90) selectedKey = 'LASER';
            else if (rand < 0.95) selectedKey = 'SHRINK';
            else selectedKey = 'SPEEDUP';
        }
        
        const type = this.powerupTypes[selectedKey];
        
        this.powerups.push({
            x: x,
            y: y,
            vy: 2.2 + (this.level * 0.1), // 難度加深掉落速度稍微加快
            radius: 12,
            type: type,
            color: type.color,
            symbol: type.symbol
        });
    }
    
    // 道具移動與接取判定
    updateFallingPowerups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += p.vy;
            
            // 微妙尾尾顆粒
            if (Math.random() < 0.3) {
                this.particles.spawnTrail(p.x, p.y, p.color);
            }
            
            // 移出畫布
            if (p.y - p.radius > this.baseHeight) {
                this.powerups.splice(i, 1);
                continue;
            }
            
            // 碰撞擋板判定
            const paddleTop = this.paddle.y - this.paddle.height / 2;
            const paddleBottom = this.paddle.y + this.paddle.height / 2;
            const paddleLeft = this.paddle.x - this.paddle.width / 2;
            const paddleRight = this.paddle.x + this.paddle.width / 2;
            
            if (p.y + p.radius >= paddleTop &&
                p.y - p.radius <= paddleBottom &&
                p.x + p.radius >= paddleLeft &&
                p.x - p.radius <= paddleRight) {
                
                // 成功接住道具！
                p.type.effect();
                this.sound.playPowerup();
                
                // 華麗火花粒子
                this.particles.spawnSparks(p.x, paddleTop, p.color, 15);
                this.powerups.splice(i, 1);
            }
        }
    }
    
    // 生命減少處理
    handleLifeLoss() {
        this.lives--;
        this.updateHUD();
        this.sound.playDeath();
        this.triggerScreenShake(300);
        
        this.resetPowerups();
        this.resetPaddle();
        
        if (this.lives <= 0) {
            this.triggerGameOver();
        } else {
            // 在擋板上重新吸附一顆球
            this.spawnBall(this.paddle.x, this.paddle.y - 12, true);
        }
    }
    
    // 觸發畫面震動
    triggerScreenShake(duration) {
        this.screenShakeTime = duration;
        document.getElementById('game-container').classList.add('screen-shake');
    }
    
    // 暫停與重置遊戲狀態
    triggerGameOver() {
        this.state = 'GAME_OVER';
        
        // 儲存本地最高分
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neon_breaker_highscore', this.highScore);
        }
        
        this.updateHUD();
        
        // 顯示遊戲結束得分
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        
        // 判斷是否夠資格登錄全球連線排行榜 (只要分數大於 0 即可登錄，若有資料則會比較第 10 名分數)
        const submitPanel = document.getElementById('leaderboard-submit-panel');
        const submitBtn = document.getElementById('submit-score-btn');
        
        if (this.score > 0) {
            if (submitPanel) submitPanel.classList.remove('hidden');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '傳送飛行紀錄';
            }
            // 清空名稱輸入框，自動取焦
            const nameInput = document.getElementById('player-name-input');
            if (nameInput) {
                nameInput.value = '';
                setTimeout(() => nameInput.focus(), 300);
            }
        } else {
            if (submitPanel) submitPanel.classList.add('hidden');
        }

        // 下載並刷新最新全球排行榜數據（遊戲結束畫面）
        this.refreshGlobalLeaderboards('end');
        
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('game-over-screen').classList.add('active');
        
        document.getElementById('game-container').classList.remove('active');
    }
    
    triggerLevelClear() {
        this.state = 'LEVEL_CLEAR';
        this.sound.playLevelUp();
        
        // 增加過關獎勵分數
        this.score += 1000;
        this.updateHUD();
        
        // 清除畫面
        this.balls = [];
        this.powerups = [];
        this.lasers = [];
        
        // 顯示過關畫面
        document.getElementById('victory-screen').classList.remove('hidden');
        document.getElementById('victory-screen').classList.add('active');
        
        document.getElementById('game-container').classList.remove('active');
    }
    
    // ==========================================================================
    // 畫布渲染繪圖
    // ==========================================================================
    draw() {
        // 清理畫布 (使用半透明黑色達成殘影流光效果)
        this.ctx.fillStyle = 'rgba(7, 8, 13, 0.25)';
        this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
        
        // 繪製背景裝飾性網格
        this.drawDecorativeGrid();
        
        // 1. 繪製不可破壞磚塊障礙物
        for (const obs of this.indestructibles) {
            this.ctx.save();
            this.ctx.fillStyle = obs.color;
            this.ctx.strokeStyle = obs.borderColor;
            this.ctx.lineWidth = 2;
            
            // 繪製發光邊緣
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = obs.borderColor;
            
            this.ctx.beginPath();
            this.ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 4);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 繪製科技條紋紋路
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let offset = 4; offset < obs.w; offset += 8) {
                this.ctx.moveTo(obs.x + offset, obs.y + 2);
                this.ctx.lineTo(obs.x + offset - 4, obs.y + obs.h - 2);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        // 2. 繪製磚塊
        for (const b of this.bricks) {
            this.ctx.save();
            
            // 建立炫光漸層色彩
            const grad = this.ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
            grad.addColorStop(0, b.color);
            grad.addColorStop(1, this.blendColors(b.color, '#000000', 0.4));
            
            this.ctx.fillStyle = grad;
            this.ctx.strokeStyle = b.color;
            this.ctx.lineWidth = 1.5;
            
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = b.color;
            
            this.ctx.beginPath();
            this.ctx.roundRect(b.x, b.y, b.w, b.h, 4);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 繪製耐受度內部小刻紋
            if (b.maxHp > 1) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.font = 'bold 10px ' + getComputedStyle(document.body).getPropertyValue('--font-header');
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('HP' + b.hp, b.x + b.w/2, b.y + b.h/2);
            }
            
            this.ctx.restore();
        }
        
        // 3. 繪製安全電防護盾 (電網)
        if (this.bottomShieldActive) {
            this.ctx.save();
            this.ctx.strokeStyle = '#bd00ff';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = '#bd00ff';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 6]); // 虛線發光特效
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.baseHeight - 10);
            this.ctx.lineTo(this.baseWidth, this.baseHeight - 10);
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        // 4. 繪製擋板
        this.ctx.save();
        const px = this.paddle.x - this.paddle.width / 2;
        const py = this.paddle.y - this.paddle.height / 2;
        
        const padGrad = this.ctx.createLinearGradient(px, py, px, py + this.paddle.height);
        padGrad.addColorStop(0, '#ffffff');
        padGrad.addColorStop(0.3, this.paddle.color);
        padGrad.addColorStop(1, '#073b4c');
        
        this.ctx.fillStyle = padGrad;
        this.ctx.strokeStyle = this.paddle.color;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.paddle.color;
        
        this.ctx.beginPath();
        this.ctx.roundRect(px, py, this.paddle.width, this.paddle.height, 6);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 如果雷射大砲激活，繪製小砲台
        if (this.activePowerups.laser > 0) {
            this.ctx.fillStyle = '#ff3333';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#ff3333';
            // 左砲台
            this.ctx.fillRect(px + 6, py - 6, 8, 8);
            // 右砲台
            this.ctx.fillRect(px + this.paddle.width - 14, py - 6, 8, 8);
        }
        
        // 如果磁性黏彈激活，繪製小磁鐵條紋
        if (this.activePowerups.sticky > 0) {
            this.ctx.strokeStyle = '#ffdf00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.paddle.x - 15, py + 2);
            this.ctx.lineTo(this.paddle.x + 15, py + 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // 5. 繪製球體
        for (const ball of this.balls) {
            this.ctx.save();
            this.ctx.fillStyle = ball.color;
            this.ctx.shadowBlur = ball.fireballActive > 0 ? 18 : 12;
            this.ctx.shadowColor = ball.color;
            
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 繪製亮眼白芯 (營造立體高光)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(ball.x - 2, ball.y - 2, ball.radius * 0.35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // 6. 繪製雷射彈體
        for (const laser of this.lasers) {
            this.ctx.save();
            this.ctx.fillStyle = laser.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = laser.color;
            this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            this.ctx.restore();
        }
        
        // 7. 繪製道具掉落物
        for (const p of this.powerups) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(7, 8, 13, 0.85)';
            this.ctx.strokeStyle = p.color;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            
            // 繪製膠囊形狀
            this.ctx.beginPath();
            this.ctx.roundRect(p.x - 16, p.y - 10, 32, 20, 10);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 繪製文字代碼
            this.ctx.fillStyle = p.color;
            this.ctx.font = 'bold 12px ' + getComputedStyle(document.body).getPropertyValue('--font-header');
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.symbol, p.x, p.y);
            this.ctx.restore();
        }
        
        // 8. 繪製粒子效果
        this.particles.draw(this.ctx);
    }
    
    drawDecorativeGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.02)';
        this.ctx.lineWidth = 1;
        
        // 垂直線
        for (let x = 40; x < this.baseWidth; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.baseHeight);
            this.ctx.stroke();
        }
        
        // 水平線
        for (let y = 40; y < this.baseHeight; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.baseWidth, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    // ==========================================================================
    // 輔助工具方法 (Helper Utilities)
    // ==========================================================================
    
    // 混和顏色 (用於建立發光漸層)
    blendColors(color1, color2, percentage) {
        // 去除 # 符號
        const c1 = color1.replace('#', '');
        const c2 = color2.replace('#', '');
        
        const r1 = parseInt(c1.substring(0, 2), 16);
        const g1 = parseInt(c1.substring(2, 4), 16);
        const b1 = parseInt(c1.substring(4, 6), 16);
        
        const r2 = parseInt(c2.substring(0, 2), 16);
        const g2 = parseInt(c2.substring(2, 4), 16);
        const b2 = parseInt(c2.substring(4, 6), 16);
        
        const r = Math.round(r1 * (1 - percentage) + r2 * percentage);
        const g = Math.round(g1 * (1 - percentage) + g2 * percentage);
        const b = Math.round(b1 * (1 - percentage) + b2 * percentage);
        
        return '#' + 
            String(r.toString(16)).padStart(2, '0') + 
            String(g.toString(16)).padStart(2, '0') + 
            String(b.toString(16)).padStart(2, '0');
    }
    
    // 核心引擎時鐘 (Loop)
    tick(timestamp) {
        // 設定每幀 16.67ms (60FPS) 當作基底時間步長
        const deltaTime = 16.67; 
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(this.tick);
    }

    // ==========================================================================
    // 全球連線排行榜與街機輸入控制方法 (Leaderboard Helpers)
    // ==========================================================================

    // 下載並更新全球線上排行榜 UI
    // target: 'start'（開始畫面）| 'end'（遊戲結束畫面）| 'both'
    async refreshGlobalLeaderboards(target = 'both') {
        const diffLabelMap = { easy: '簡單', normal: '一般', hard: '困難' };

        const renderPanel = async (loadingId, tableId, bodyId, difficulty) => {
            const loading = document.getElementById(loadingId);
            const table   = document.getElementById(tableId);
            const body    = document.getElementById(bodyId);
            if (!loading || !table || !body) return;

            loading.classList.remove('hidden');
            loading.textContent = 'CONNECTING TO CYBERNET...';
            table.classList.add('hidden');

            const scores = await this.leaderboard.getScores(difficulty);

            if (scores === null) {
                loading.textContent = 'CYBERNET OFFLINE (離線模式)';
                return;
            }

            body.innerHTML = '';
            if (scores.length === 0) {
                body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#828ba8;padding:20px 0;">尚無紀錄，等待首位開拓者...</td></tr>`;
            } else {
                scores.forEach((entry, idx) => {
                    const row = document.createElement('tr');
                    let rankHtml = `${idx + 1}`;
                    if (idx === 0) rankHtml = '🥇 1';
                    else if (idx === 1) rankHtml = '🥈 2';
                    else if (idx === 2) rankHtml = '🥉 3';
                    row.innerHTML = `
                        <td>${rankHtml}</td>
                        <td>${entry.name}</td>
                        <td>${entry.level}</td>
                        <td>${String(entry.score).padStart(6, '0')}</td>
                    `;
                    body.appendChild(row);
                });
            }

            loading.classList.add('hidden');
            table.classList.remove('hidden');
        };

        if (target === 'start' || target === 'both') {
            // 開始畫面：依 lbDisplayDiff 顯示，並更新副標題
            const subtitle = document.getElementById('lb-start-subtitle');
            if (subtitle) subtitle.textContent = `[${diffLabelMap[this.lbDisplayDiff] || this.lbDisplayDiff}]`;
            await renderPanel('global-board-start-loading', 'global-board-start', 'global-board-start-body', this.lbDisplayDiff);
        }
        if (target === 'end' || target === 'both') {
            // 遊戲結束畫面：固定顯示本局難度
            const subtitle = document.getElementById('lb-end-subtitle');
            if (subtitle) subtitle.textContent = `[${diffLabelMap[this.difficulty] || this.difficulty}]`;
            await renderPanel('global-board-end-loading', 'global-board-end', 'global-board-end-body', this.difficulty);
        }
    }

    // 將玩家名稱與分數上傳至 Dreamlo
    async submitOnlineScore() {
        const nameInput = document.getElementById('player-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            if (nameInput) {
                nameInput.focus();
                nameInput.placeholder = '請先輸入名字！';
            }
            return;
        }

        const submitBtn = document.getElementById('submit-score-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'TRANSMITTING...';
        }

        const success = await this.leaderboard.addScore(name, this.score, this.level, this.difficulty);

        if (success) {
            const submitPanel = document.getElementById('leaderboard-submit-panel');
            if (submitPanel) submitPanel.classList.add('hidden');
            await this.refreshGlobalLeaderboards('end');
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'RETRY TRANSMIT (重試傳送)';
            }
        }
    }
}

// 建立全局 Engine 實例
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
