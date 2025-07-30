const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    uniform mat3 u_matrix;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec2 position = (u_matrix * vec3(a_position, 1.0)).xy;
        gl_Position = vec4(position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform sampler2D u_noiseTexture;
    uniform vec4 u_color;
    uniform float u_useTexture;
    uniform float u_hover;
    uniform float u_expand;
    uniform float u_dissolveProgress;
    uniform vec2 u_resolution;
    uniform vec2 u_cardSize;
    uniform vec2 u_cardPos;
    
    varying vec2 v_texCoord;
    
    // Simple noise function for dissolve pattern
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    // Rounded rectangle SDF
    float roundedRectSDF(vec2 centerPos, vec2 size, float radius) {
        return length(max(abs(centerPos) - size + radius, 0.0)) - radius;
    }
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        vec4 solidColor = u_color;
        
        vec4 baseColor = mix(solidColor, texColor, u_useTexture);
        
        // Add hover effect
        float brightness = 1.0 + u_hover * 0.2;
        baseColor.rgb *= brightness;
        
        // Calculate rounded corners and border
        vec2 pixelPos = v_texCoord * u_cardSize;
        vec2 centerPos = pixelPos - u_cardSize * 0.5;
        float cornerRadius = 20.0; // 20 pixel radius
        float borderWidth = 2.0; // 2 pixel border
        
        // Outer edge distance
        float outerDistance = roundedRectSDF(centerPos, u_cardSize * 0.5, cornerRadius);
        // Inner edge distance (for border)
        float innerDistance = roundedRectSDF(centerPos, u_cardSize * 0.5 - borderWidth, cornerRadius - borderWidth);
        
        // Create border mask
        float smoothing = 1.0;
        float outerAlpha = 1.0 - smoothstep(0.0, smoothing, outerDistance);
        float innerAlpha = 1.0 - smoothstep(0.0, smoothing, innerDistance);
        float borderAlpha = outerAlpha - innerAlpha;
        
        // For background rectangles
        if (u_useTexture < 0.5) {
            // Black background with 0.5 opacity inside the card
            vec4 blackBackground = vec4(0.0, 0.0, 0.0, 0.5);
            // Border color - transitions from white to cyan-blue on hover
            vec3 normalBorderColor = vec3(1.0, 1.0, 1.0);
            vec3 hoverBorderColor = vec3(0.0, 0.8, 1.0); // Cyan-blue
            vec3 borderColor = mix(normalBorderColor, hoverBorderColor, u_hover);
            vec4 border = vec4(borderColor, 1.0);
            
            // Mix between background and border
            baseColor = mix(blackBackground, border, borderAlpha);
            baseColor.a *= outerAlpha;
        } else {
            // For text, keep it solid within the card bounds
            baseColor.a *= outerAlpha;
        }
        
        // Reverse dissolve effect (1.0 - progress for reverse)
        float dissolveAmount = 1.0 - u_dissolveProgress;
        
        // Use noise for dissolve pattern
        float noiseValue = noise(v_texCoord * 10.0);
        
        // Edge parameters
        float edge_width = mix(0.15, 0.05, u_dissolveProgress);
        
        // Create dissolve mask
        float dissolveMask = smoothstep(dissolveAmount - edge_width, dissolveAmount + edge_width, noiseValue);
        
        // Ensure full opacity when dissolve is complete
        if (u_dissolveProgress >= 0.99) {
            dissolveMask = 1.0;
        }
        
        // Edge glow effect
        float edgeGlow = 1.0 - smoothstep(0.0, edge_width * 2.0, abs(noiseValue - dissolveAmount));
        vec3 edgeColor = vec3(0.3, 0.5, 1.0) * edgeGlow * 2.0;
        
        // Apply dissolve
        baseColor.rgb += edgeColor * (1.0 - dissolveMask);
        baseColor.a *= dissolveMask;
        
        // Discard pixels with very low alpha to prevent artifacts
        if (baseColor.a < 0.01) {
            discard;
        }
        
        gl_FragColor = baseColor;
    }
`;

class Portfolio {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = this.canvas.getContext('webgl', { alpha: true });
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }
        
        // Button container will be created dynamically
        this.buttonContainer = null;
        
        this.projects = [
            {
                title: 'Roguelite Tactics',
                description: 'Turn-based tactical roguelite game built with Godot 4.4, featuring procedural generation and strategic combat. Organized project architecture with dedicated systems for UI, enemies, players, and shader effects. Currently in active development with 57 commits.',
                tech: 'Godot 4.4, GDScript, Procedural Generation',
                color: [0.8, 0.8, 0.2, 1.0],
                github: 'https://github.com/ntlblpm/roguelite-tactics',
                video: 'https://vimeo.com/1105307847?share=copy#t=0'
            },
            {
                title: 'Foto Fun',
                description: 'Free, open-source Photoshop alternative with 32+ professional photo editing tools. Features AI-powered editing with natural language control, including background removal, upscaling, and image generation. Built with an Orchestrator-Worker AI workflow for intuitive editing.',
                tech: 'Next.js, React, TypeScript, AI APIs',
                color: [0.8, 0.2, 0.4, 1.0],
                github: 'https://github.com/gauntletai-p4-pointer/foto-fun',
                video: 'https://www.youtube.com/watch?v=fCd3eHwUgUg'
            },
            {
                title: 'WordWise.ai',
                description: 'AI-powered writing assistant and text analysis tool built with modern web technologies. Leverages Firebase for backend services and features a clean, responsive interface designed with TypeScript and React for robust, type-safe development.',
                tech: 'React, TypeScript, Firebase',
                color: [0.4, 0.2, 0.8, 1.0],
                github: 'https://github.com/akgauntlet/wordwise.ai',
                video: 'https://www.loom.com/share/7adde2d4defb43d78a95ae51c2984e9b'
            },
            {
                title: 'Restaurant Delivery Checker',
                description: 'AI-powered desktop app for analyzing restaurant delivery options with nutrition and review scoring. Combines real-time data from UberEats and Yelp with sentiment analysis to provide comprehensive restaurant evaluation beyond traditional review platforms.',
                tech: 'React, Rust (Tauri), AI Integration',
                color: [0.2, 0.8, 0.4, 1.0],
                github: 'https://github.com/akgauntlet/restaurant-delivery-checker',
                video: 'https://www.loom.com/share/9ff5d910e04f45d99b3fca7316ed07a0'
            },
            {
                title: 'LibreOffice Writer Enhanced',
                description: 'Open-source contribution to LibreOffice core, focusing on direct productivity enhancements to Writer. Part of a large community-driven project supporting multiple platforms including Windows, macOS, Linux, iOS, and Android.',
                tech: 'C++, LibreOffice Core, Cross-platform',
                color: [0.2, 0.4, 0.8, 1.0],
                github: 'https://github.com/ntlblpm/core',
                video: 'https://vimeo.com/1104959107'
            },
            {
                title: 'SnapConnect',
                description: 'Gaming-focused social platform with ephemeral messaging and rich profile customization. Features AI-powered conversation starters, achievement system with multiple rarity levels, and real-time disappearing messages. Supports cyberpunk/gaming aesthetics with multiple theme options.',
                tech: 'React Native, Firebase, AI-powered',
                color: [0.8, 0.4, 0.2, 1.0],
                github: 'https://github.com/akgauntlet/snapconnect',
                video: 'https://www.loom.com/share/74880222132a455ba52362fbbfe60769'
            }
        ];
        
        this.cards = [];
        this.hoveredCard = null;
        this.expandedCard = null;
        this.lastExpandedCard = null;
        this.animationTime = 0;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        this.setupGL();
        this.createCards();
        this.setupEvents();
        this.resize();
        this.animate();
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
    }
    
    setupGL() {
        const gl = this.gl;
        
        // Create shaders
        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        
        // Get locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        this.matrixLocation = gl.getUniformLocation(this.program, 'u_matrix');
        this.colorLocation = gl.getUniformLocation(this.program, 'u_color');
        this.useTextureLocation = gl.getUniformLocation(this.program, 'u_useTexture');
        this.hoverLocation = gl.getUniformLocation(this.program, 'u_hover');
        this.expandLocation = gl.getUniformLocation(this.program, 'u_expand');
        this.dissolveProgressLocation = gl.getUniformLocation(this.program, 'u_dissolveProgress');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.cardSizeLocation = gl.getUniformLocation(this.program, 'u_cardSize');
        this.cardPosLocation = gl.getUniformLocation(this.program, 'u_cardPos');
        
        // Create buffers
        this.positionBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        
        // Set up texture for text rendering
        this.textCanvas = document.createElement('canvas');
        this.textCtx = this.textCanvas.getContext('2d');
        this.textTexture = gl.createTexture();
        
        // Texture cache to prevent memory leaks
        this.textureCache = new Map();
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link failed:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createCards() {
        const cols = 3;
        const rows = Math.ceil(this.projects.length / cols);
        const padding = 40;
        const cardSpacing = 20;
        
        this.projects.forEach((project, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            this.cards.push({
                project: project,
                index: index,
                col: col,
                row: row,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                targetX: 0,
                targetY: 0,
                targetWidth: 0,
                targetHeight: 0,
                hover: 0,
                targetHover: 0,
                expand: 0,
                targetExpand: 0,
                dissolveProgress: 0,
                dissolveDelay: (col * 0.1 + row * 0.2), // Staggered appearance
                pageOpenStarted: false,
                cardDissolveProgress: 1.0, // For card click dissolve
                targetCardDissolveProgress: 1.0,
                cardDissolveStartTime: 0,
                cardDissolveDelay: 0,
                initialized: false
            });
        });
    }
    
    resize() {
        const canvas = this.canvas;
        const gl = this.gl;
        
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        this.updateCardPositions();
        
        // Update button positions if expanded
        if (this.expandedCard && this.buttonContainer) {
            this.positionCardButtons(this.expandedCard);
        }
    }
    
    updateCardPositions() {
        const cols = 3;
        const padding = 80;
        const cardSpacing = 30;
        const maxCardWidth = 370;
        
        const availableWidth = this.canvas.width - padding * 2;
        const cardWidth = Math.min((availableWidth - cardSpacing * (cols - 1)) / cols, maxCardWidth);
        const cardHeight = cardWidth * 0.8;
        
        const totalWidth = cardWidth * cols + cardSpacing * (cols - 1);
        const startX = (this.canvas.width - totalWidth) / 2;
        
        const rows = Math.ceil(this.cards.length / cols);
        const totalHeight = cardHeight * rows + cardSpacing * (rows - 1);
        const startY = (this.canvas.height - totalHeight) / 2 + 10;
        
        this.cards.forEach((card) => {
            if (this.expandedCard === card) {
                card.targetX = this.canvas.width * 0.1;
                card.targetY = this.canvas.height * 0.1;
                card.targetWidth = this.canvas.width * 0.8;
                card.targetHeight = this.canvas.height * 0.8;
                card.targetExpand = 1;
            } else {
                card.targetX = startX + card.col * (cardWidth + cardSpacing);
                card.targetY = startY + card.row * (cardHeight + cardSpacing);
                card.targetWidth = cardWidth;
                card.targetHeight = cardHeight;
                card.targetExpand = 0;
            }
        });
    }
    
    createCardButtons(card) {
        // Remove any existing buttons first
        this.removeCardButtons();
        
        // Create button container
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = 'card-buttons';
        this.buttonContainer.style.cssText = `
            position: fixed;
            display: flex;
            gap: 20px;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s ease-out;
        `;
        
        // Create View Code button
        const viewCodeBtn = document.createElement('button');
        viewCodeBtn.innerHTML = `
            <svg width="21" height="21" viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.8)" style="vertical-align: middle; margin-right: 8px;">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View Code
        `;
        viewCodeBtn.style.cssText = `
            font-family: 'ProFontWindows', monospace;
            padding: 12px 24px;
            font-size: 18px;
            background: transparent;
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.8);
            border-radius: 10px;
            cursor: pointer;
            transition: border-color 0.3s ease-out, color 0.3s ease-out;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create Watch Demo button
        const watchDemoBtn = document.createElement('button');
        watchDemoBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.8)" style="vertical-align: middle; margin-right: 8px;">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            View Demo
        `;
        watchDemoBtn.style.cssText = viewCodeBtn.style.cssText;
        
        // Add hover effects
        [viewCodeBtn, watchDemoBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = 'rgba(0, 204, 255, 0.8)';
                btn.style.color = 'rgba(0, 204, 255, 0.9)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                btn.style.color = 'rgba(255, 255, 255, 0.8)';
            });
        });
        
        // Add click handlers
        viewCodeBtn.addEventListener('click', () => {
            if (card.project.github) {
                window.open(card.project.github, '_blank');
            }
        });
        
        watchDemoBtn.addEventListener('click', () => {
            if (card.project.video) {
                window.open(card.project.video, '_blank');
            }
        });
        
        // Add buttons to container
        this.buttonContainer.appendChild(viewCodeBtn);
        this.buttonContainer.appendChild(watchDemoBtn);
        document.body.appendChild(this.buttonContainer);
        
        // Position buttons inside the expanded card
        this.positionCardButtons(card);
        
        // Fade in buttons
        setTimeout(() => {
            this.buttonContainer.style.opacity = '1';
        }, 50);
    }
    
    removeCardButtons() {
        if (this.buttonContainer) {
            this.buttonContainer.style.opacity = '0';
            setTimeout(() => {
                if (this.buttonContainer && this.buttonContainer.parentNode) {
                    this.buttonContainer.parentNode.removeChild(this.buttonContainer);
                    this.buttonContainer = null;
                }
            }, 300);
        }
    }
    
    positionCardButtons(card) {
        if (!this.buttonContainer) return;
        
        // Convert WebGL coordinates to screen coordinates
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        
        // Position buttons at the bottom center of the expanded card
        const centerX = rect.left + (card.x + card.width / 2) * scaleX;
        const bottomY = rect.top + (card.y + card.height * 0.85) * scaleY;
        
        this.buttonContainer.style.left = `${centerX}px`;
        this.buttonContainer.style.top = `${bottomY}px`;
        this.buttonContainer.style.transform = 'translateX(-50%)';
    }
    
    setupEvents() {
        window.addEventListener('resize', () => this.resize());
        
        // Button click handlers will be added dynamically
        
        this.canvas.addEventListener('mousemove', (e) => {
            // Disable hover when animating or when a card is expanded
            if (this.isAnimating || this.expandedCard) {
                this.hoveredCard = null;
                this.cards.forEach(card => {
                    if (card !== this.expandedCard) {
                        card.targetHover = 0;
                    }
                });
                this.canvas.style.cursor = 'default';
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * window.devicePixelRatio;
            const y = (e.clientY - rect.top) * window.devicePixelRatio;
            
            this.hoveredCard = null;
            this.cards.forEach(card => {
                if (x >= card.x && x <= card.x + card.width &&
                    y >= card.y && y <= card.y + card.height) {
                    this.hoveredCard = card;
                    // Don't apply hover to expanded cards
                    if (card !== this.expandedCard) {
                        card.targetHover = 1;
                    }
                } else {
                    card.targetHover = 0;
                }
            });
            
            this.canvas.style.cursor = this.hoveredCard ? 'pointer' : 'default';
        });
        
        this.canvas.addEventListener('click', (e) => {
            // Disable clicks when animating
            if (this.isAnimating) {
                return;
            }
            
            // If a card is expanded
            if (this.expandedCard) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * window.devicePixelRatio;
                const y = (e.clientY - rect.top) * window.devicePixelRatio;
                
                // Check if click is inside the expanded card
                const clickedInsideExpanded = x >= this.expandedCard.x && 
                                            x <= this.expandedCard.x + this.expandedCard.width &&
                                            y >= this.expandedCard.y && 
                                            y <= this.expandedCard.y + this.expandedCard.height;
                
                if (!clickedInsideExpanded) {
                    // Clicking outside - close expanded card and reverse dissolve
                    this.lastExpandedCard = this.expandedCard;
                    this.expandedCard = null;
                    
                    // Remove buttons
                    this.removeCardButtons();
                    
                    const currentTime = this.animationTime;
                    this.cards.forEach(card => {
                        if (card !== this.lastExpandedCard) {
                            card.targetCardDissolveProgress = 1.0; // Reverse dissolve
                            card.cardDissolveStartTime = currentTime;
                            card.cardDissolveDelay = (card.col * 0.1 + card.row * 0.2); // Same stagger as page load
                        }
                    });
                    this.updateCardPositions();
                }
                return;
            }
            
            if (this.hoveredCard) {
                // Opening a new card - dissolve others
                this.expandedCard = this.hoveredCard;
                this.lastExpandedCard = this.hoveredCard;
                // Remove hover state from the clicked card
                this.expandedCard.targetHover = 0;
                
                // Create and show buttons for this card
                this.createCardButtons(this.expandedCard);
                
                this.cards.forEach(card => {
                    if (card !== this.expandedCard) {
                        card.targetCardDissolveProgress = 0.0; // Dissolve
                        card.cardDissolveStartTime = this.animationTime;
                        card.cardDissolveDelay = 0; // No stagger for dissolving out
                    }
                });
                this.updateCardPositions();
            }
        });
    }
    
    generateTextureCacheKey(card) {
        // Create a unique key based on card state that affects rendering
        const expandRounded = Math.round(card.expand * 100) / 100; // Round to 2 decimal places
        const key = `${card.project.title}_${expandRounded}_${card.width}x${card.height}`;
        return key;
    }
    
    createTextTexture(card) {
        const gl = this.gl;
        const cacheKey = this.generateTextureCacheKey(card);
        
        // Check if texture exists in cache
        if (this.textureCache.has(cacheKey)) {
            const cachedTexture = this.textureCache.get(cacheKey);
            gl.bindTexture(gl.TEXTURE_2D, cachedTexture);
            return;
        }
        
        // Clean up old textures if cache is getting too large
        if (this.textureCache.size > 20) {
            // Delete oldest entries
            const entriesToDelete = [];
            let count = 0;
            for (const [key, texture] of this.textureCache) {
                if (count++ < 5) {
                    entriesToDelete.push(key);
                    gl.deleteTexture(texture);
                }
            }
            entriesToDelete.forEach(key => this.textureCache.delete(key));
        }
        
        // Create new texture
        const newTexture = gl.createTexture();
        const canvas = this.textCanvas;
        const ctx = this.textCtx;
        
        const scale = window.devicePixelRatio;
        canvas.width = card.width;
        canvas.height = card.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const expandProgress = card.expand;
        const titleTransition = Math.min(expandProgress * 2, 1); // Title transitions first
        const descriptionOpacity = Math.max(0, (expandProgress - 0.3) / 0.7); // Description fades in later
        
        // Helper function to wrap text
        const wrapText = (text, maxWidth) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine !== '') {
                    lines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            });
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
            }
            return lines;
        };
        
        // Title - smoothly transition size and position with word wrapping
        const titleSize = 30 + (44 - 30) * expandProgress;
        ctx.font = `${titleSize}px 'ProFontWindows', monospace`;
        ctx.fillStyle = 'white';
        
        const titleMaxWidth = canvas.width * 0.85;
        const titleLines = wrapText(card.project.title, titleMaxWidth);
        const titleLineHeight = titleSize * 1.3;
        
        // For collapsed state, title starts at fixed position from top
        // For expanded state, move to 30% height (moved down from 20%)
        const titleStartY = (canvas.height * 0.37 - 5) + (canvas.height * 0.25 - (canvas.height * 0.37 - 5)) * expandProgress;
        
        titleLines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, titleStartY + index * titleLineHeight);
        });
        
        // Tech stack - smooth transition between collapsed and expanded positions
        const techSize = 20 + (22 - 20) * expandProgress; // Slight size increase
        ctx.font = `${techSize}px 'ProFontWindows', monospace`;
        ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
        
        const techMaxWidth = canvas.width * (0.75 - 0.1 * expandProgress); // Adjust width for expanded view
        const techLines = wrapText(card.project.tech, techMaxWidth);
        const techLineHeight = 20 + 4 * expandProgress; // Slightly increase line height
        
        // Smoothly transition position from collapsed to expanded location
        const collapsedTechY = canvas.height * 0.67;
        // Use a fixed expanded position relative to canvas height for stability
        const expandedTechY = canvas.height * 0.65; // Stable position in expanded view
        const techStartY = collapsedTechY + (expandedTechY - collapsedTechY) * expandProgress;
        
        techLines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, techStartY + index * techLineHeight);
        });
        
        // Description - fade in during expansion
        if (descriptionOpacity > 0) {
            ctx.font = `${24}px 'ProFontWindows', monospace`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * descriptionOpacity})`;
            
            // Calculate description width based on target expanded card size to prevent word rearrangement
            // Use the target width instead of current width to keep text layout stable
            const targetCardWidth = this.expandedCard === card ? this.canvas.width * 0.8 : card.width;
            const descMaxWidth = targetCardWidth * 0.75;
            const descLines = wrapText(card.project.description, descMaxWidth);
            const descLineHeight = 28;
            
            // Position description at fixed position for consistency (moved down from 35% to 45%)
            const descStartY = canvas.height * 0.40;
            
            descLines.forEach((line, index) => {
                ctx.fillText(line, canvas.width / 2, descStartY + index * descLineHeight);
            });
        }
        
        // Update texture
        gl.bindTexture(gl.TEXTURE_2D, newTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Store in cache
        this.textureCache.set(cacheKey, newTexture);
    }
    
    animate() {
        this.animationTime += 0.016;
        
        // Check if any card is animating
        let anyCardAnimating = false;
        
        // Update card animations
        this.cards.forEach(card => {
            // Initialize card at target position on first frame
            if (!card.initialized) {
                card.x = card.targetX;
                card.y = card.targetY;
                card.width = card.targetWidth;
                card.height = card.targetHeight;
                card.initialized = true;
            } else {
                // Normal animations after initialization
                card.x += (card.targetX - card.x) * 0.1;
                card.y += (card.targetY - card.y) * 0.1;
                card.width += (card.targetWidth - card.width) * 0.1;
                card.height += (card.targetHeight - card.height) * 0.1;
            }
            
            card.hover += (card.targetHover - card.hover) * 0.1;
            card.expand += (card.targetExpand - card.expand) * 0.1;
            
            // Update page open dissolve progress
            const dissolveStartTime = card.dissolveDelay;
            const dissolveDuration = 0.67; // ~0.67 seconds (50% faster than 1 second)
            
            if (this.animationTime >= dissolveStartTime) {
                card.pageOpenStarted = true;
                const elapsedTime = this.animationTime - dissolveStartTime;
                card.dissolveProgress = Math.min(1.0, Math.max(0.0, elapsedTime / dissolveDuration));
            } else {
                // Keep card invisible until its animation starts
                card.dissolveProgress = 0;
            }
            
            // Update card click dissolve progress with identical timing to page load
            if (card.cardDissolveStartTime > 0) {
                const dissolveStartTime = card.cardDissolveStartTime + card.cardDissolveDelay;
                const dissolveDuration = card.targetCardDissolveProgress === 1.0 ? 0.67 : 0.536; // 20% faster for dissolve-out
                
                if (this.animationTime >= dissolveStartTime) {
                    const elapsedTime = this.animationTime - dissolveStartTime;
                    if (card.targetCardDissolveProgress === 1.0) {
                        // Reappearing (reverse dissolve)
                        card.cardDissolveProgress = Math.min(1.0, Math.max(0.0, elapsedTime / dissolveDuration));
                    } else {
                        // Disappearing
                        card.cardDissolveProgress = Math.max(0.0, 1.0 - (elapsedTime / dissolveDuration));
                    }
                }
            }
            
            // Check if this card is still animating
            const positionThreshold = 1;
            const expandThreshold = 0.01;
            const dissolveThreshold = 0.01;
            
            const isMoving = Math.abs(card.x - card.targetX) > positionThreshold ||
                           Math.abs(card.y - card.targetY) > positionThreshold ||
                           Math.abs(card.width - card.targetWidth) > positionThreshold ||
                           Math.abs(card.height - card.targetHeight) > positionThreshold;
            
            const isExpandAnimating = Math.abs(card.expand - card.targetExpand) > expandThreshold;
            
            const isDissolving = card.cardDissolveStartTime > 0 && 
                               Math.abs(card.cardDissolveProgress - card.targetCardDissolveProgress) > dissolveThreshold;
            
            if (isMoving || isExpandAnimating || isDissolving) {
                anyCardAnimating = true;
            }
        });
        
        // Update global animation state
        this.isAnimating = anyCardAnimating;
        
        // Clear lastExpandedCard when animation is complete
        if (this.lastExpandedCard && this.lastExpandedCard.expand < 0.01) {
            this.lastExpandedCard = null;
        }
        
        // Update button positions if card is expanded/collapsing and animating
        const activeCard = this.expandedCard || this.lastExpandedCard;
        if (activeCard && this.buttonContainer) {
            const isMoving = Math.abs(activeCard.x - activeCard.targetX) > 0.5 ||
                           Math.abs(activeCard.y - activeCard.targetY) > 0.5 ||
                           Math.abs(activeCard.width - activeCard.targetWidth) > 0.5 ||
                           Math.abs(activeCard.height - activeCard.targetHeight) > 0.5;
            
            if (isMoving || activeCard.expand > 0.01) {
                this.positionCardButtons(activeCard);
            }
        }
        
        this.render();
        requestAnimationFrame(() => this.animate());
    }
    
    render() {
        const gl = this.gl;
        const canvas = this.canvas;
        
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(this.program);
        
        // Enable vertex attributes
        gl.enableVertexAttribArray(this.positionLocation);
        gl.enableVertexAttribArray(this.texCoordLocation);
        
        // Bind buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Determine which card should be on top
        const topCard = this.expandedCard || this.lastExpandedCard;
        const dimmingFactor = topCard ? topCard.expand * 0.6 : 0;
        
        // Draw all cards except the top card
        this.cards.forEach(card => {
            // Skip rendering if card is fully dissolved out
            if (card !== topCard && card.pageOpenStarted && card.cardDissolveProgress > 0.01) {
                // Apply dimming to background color
                const dimmedColor = card.project.color.map((c, i) => 
                    i < 3 ? c * (1 - dimmingFactor) : c
                );
                
                // Draw card background (color doesn't matter for background as shader will use black/white)
                this.drawRect(
                    card.x, card.y,
                    card.width, card.height,
                    [0, 0, 0, 1],
                    card.hover,
                    card.expand,
                    false,
                    card.dissolveProgress * card.cardDissolveProgress
                );
                
                // Draw text with dimming
                this.createTextTexture(card);
                const textColor = [
                    1 - dimmingFactor,
                    1 - dimmingFactor,
                    1 - dimmingFactor,
                    1
                ];
                this.drawRect(
                    card.x, card.y,
                    card.width, card.height,
                    textColor,
                    card.hover,
                    card.expand,
                    true,
                    card.dissolveProgress * card.cardDissolveProgress
                );
            }
        });
        
        // Draw the top card last
        if (topCard && topCard.pageOpenStarted) {
            // Draw card background (color doesn't matter for background as shader will use black/white)
            this.drawRect(
                topCard.x, topCard.y,
                topCard.width, topCard.height,
                [0, 0, 0, 1],
                topCard.hover,
                topCard.expand,
                false,
                topCard.dissolveProgress
            );
            
            // Draw text
            this.createTextTexture(topCard);
            this.drawRect(
                topCard.x, topCard.y,
                topCard.width, topCard.height,
                [1, 1, 1, 1],
                topCard.hover,
                topCard.expand,
                true,
                topCard.dissolveProgress
            );
        }
    }
    
    drawRect(x, y, width, height, color, hover, expand, useTexture, dissolveProgress) {
        const gl = this.gl;
        const canvas = this.canvas;
        
        // Convert pixel coordinates to clip space
        const left = (x / canvas.width) * 2 - 1;
        const right = ((x + width) / canvas.width) * 2 - 1;
        const top = -((y / canvas.height) * 2 - 1);
        const bottom = -(((y + height) / canvas.height) * 2 - 1);
        
        // Set rectangle vertices
        const positions = new Float32Array([
            left, top,
            right, top,
            left, bottom,
            left, bottom,
            right, top,
            right, bottom
        ]);
        
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1
        ]);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        
        // Set uniforms
        const matrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
        gl.uniformMatrix3fv(this.matrixLocation, false, matrix);
        gl.uniform4fv(this.colorLocation, color);
        gl.uniform1f(this.useTextureLocation, useTexture ? 1.0 : 0.0);
        gl.uniform1f(this.hoverLocation, hover);
        gl.uniform1f(this.expandLocation, expand);
        gl.uniform1f(this.dissolveProgressLocation, dissolveProgress || 1.0);
        gl.uniform2f(this.resolutionLocation, canvas.width, canvas.height);
        gl.uniform2f(this.cardSizeLocation, width, height);
        gl.uniform2f(this.cardPosLocation, x, y);
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

// Shader background class
class ShaderBackground {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported for background');
            return;
        }
        
        this.startTime = Date.now();
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // Create shaders
        const vertexShader = this.createShader(gl.VERTEX_SHADER, this.getVertexShader());
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, this.getFragmentShader());
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program:', gl.getProgramInfoLog(this.program));
            return;
        }
        
        // Get uniform locations
        this.iTimeLocation = gl.getUniformLocation(this.program, 'iTime');
        this.iResolutionLocation = gl.getUniformLocation(this.program, 'iResolution');
        
        // Create vertex buffer
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0,
        ]);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLocation = gl.getAttribLocation(this.program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Start rendering
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.render();
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    getVertexShader() {
        return `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
    }
    
    getFragmentShader() {
        return `
            precision highp float;
            
            uniform float iTime;
            uniform vec2 iResolution;
            
            #define TIME        iTime
            #define RESOLUTION  iResolution
            #define PI          3.141592654
            #define TAU         (2.0*PI)
            
            const float gravity = 1.0;
            const float waterTension = 0.01;
            
            const vec3 skyCol1 = vec3(0.6, 0.35, 0.3).zyx*0.5;
            const vec3 skyCol2 = vec3(1.0, 0.3, 0.3).zyx*0.5 ;
            const vec3 sunCol1 = vec3(1.0,0.5,0.4).zyx;
            const vec3 sunCol2 = vec3(1.0,0.8,0.8).zyx;
            const vec3 seaCol1 = vec3(0.1,0.2,0.2)*0.2;
            const vec3 seaCol2 = vec3(0.2,0.9,0.6)*0.5;
            
            float tanh_approx(float x) {
                float x2 = x*x;
                return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
            }
            
            vec2 wave(in float t, in float a, in float w, in float p) {
                float x = t;
                float y = a*sin(t*w + p);
                return vec2(x, y);
            }
            
            vec2 dwave(in float t, in float a, in float w, in float p) {
                float dx = 1.0;
                float dy = a*w*cos(t*w + p);
                return vec2(dx, dy);
            }
            
            vec2 gravityWave(in float t, in float a, in float k, in float h) {
                float w = sqrt(gravity*k*tanh_approx(k*h));
                return wave(t, a ,k, w*TIME);
            }
            
            vec2 capillaryWave(in float t, in float a, in float k, in float h) {
                float w = sqrt((gravity*k + waterTension*k*k*k)*tanh_approx(k*h));
                return wave(t, a, k, w*TIME);
            }
            
            vec2 gravityWaveD(in float t, in float a, in float k, in float h) {
                float w = sqrt(gravity*k*tanh_approx(k*h));
                return dwave(t, a, k, w*TIME);
            }
            
            vec2 capillaryWaveD(in float t, in float a, in float k, in float h) {
                float w = sqrt((gravity*k + waterTension*k*k*k)*tanh_approx(k*h));
                return dwave(t, a, k, w*TIME);
            }
            
            void mrot(inout vec2 p, in float a) {
                float c = cos(a);
                float s = sin(a);
                p = vec2(c*p.x + s*p.y, -s*p.x + c*p.y);
            }
            
            vec4 sea(in vec2 p, in float ia) {
                float y = 0.0;
                vec3 d = vec3(0.0);
            
                const int maxIter = 8;
                const int midIter = 4;
            
                float kk = 1.0/1.3;
                float aa = 1.0/(kk*kk);
                float k = 1.0*pow(kk, -float(maxIter) + 1.0);
                float a = ia*0.25*pow(aa, -float(maxIter) + 1.0);
            
                float h = 25.0;
                p *= 0.5;
                
                vec2 waveDir = vec2(0.0, 1.0);
            
                for (int i = midIter; i < maxIter; ++i) {
                    float t = dot(-waveDir, p) + float(i);
                    y += capillaryWave(t, a, k, h).y;
                    vec2 dw = capillaryWaveD(-t, a, k, h);
                    
                    d += vec3(waveDir.x, dw.y, waveDir.y);
            
                    mrot(waveDir, PI/3.0);
            
                    k *= kk;
                    a *= aa;
                }
                
                waveDir = vec2(0.0, 1.0);
            
                for (int i = 0; i < midIter; ++i) {
                    float t = dot(waveDir, p) + float(i);
                    y += gravityWave(t, a, k, h).y;
                    vec2 dw = gravityWaveD(t, a, k, h);
                    
                    vec2 d2 = vec2(0.0, dw.x);
                    
                    d += vec3(waveDir.x, dw.y, waveDir.y);
            
                    mrot(waveDir, -step(2.0, float(i)));
            
                    k *= kk;
                    a *= aa;
                }
            
                vec3 t = normalize(d);
                vec3 nxz = normalize(vec3(t.z, 0.0, -t.x));
                vec3 nor = cross(t, nxz);
            
                return vec4(y, nor);
            }
            
            vec3 sunDirection() {
                vec3 dir = normalize(vec3(0, 0.06, 1));
                return dir;
            }
            
            vec3 skyColor(in vec3 rd) {
                vec3 sunDir = sunDirection();
                float sunDot = max(dot(rd, sunDir), 0.0);
                vec3 final = vec3(0.0);
                final += mix(skyCol1, skyCol2, rd.y);
                final += 0.5*sunCol1*pow(sunDot, 90.0);
                final += 4.0*sunCol2*pow(sunDot, 900.0);
                return final;
            }
            
            vec3 render(in vec3 ro, in vec3 rd) {
                vec3 col = vec3(0.0);
            
                float dsea = (0.0 - ro.y)/rd.y;
                
                vec3 sunDir = sunDirection();
                
                vec3 sky = skyColor(rd);
                
                if (dsea > 0.0) {
                    vec3 p = ro + dsea*rd;
                    vec4 s = sea(p.xz, 1.0);
                    float h = s.x;    
                    vec3 nor = s.yzw;
                    nor = mix(nor, vec3(0.0, 1.0, 0.0), smoothstep(0.0, 200.0, dsea));
            
                    float fre = clamp(1.0 - dot(-nor,rd), 0.0, 1.0);
                    fre = fre*fre*fre;
                    float dif = mix(0.25, 1.0, max(dot(nor,sunDir), 0.0));
                    
                    vec3 refl = skyColor(reflect(rd, nor));
                    vec3 refr = seaCol1 + dif*sunCol1*seaCol2*0.1; 
                    
                    col = mix(refr, 0.9*refl, fre);
                    
                    float atten = max(1.0 - dot(dsea,dsea) * 0.001, 0.0);
                    col += seaCol2*(p.y - h) * 2.0 * atten;
                    
                    col = mix(col, sky, 1.0 - exp(-0.01*dsea));
                    
                } else {
                    col = sky;
                }
                
                return col;
            }
            
            void main() {
                vec2 q = gl_FragCoord.xy/RESOLUTION.xy;
                vec2 p = -1.0 + 2.0*q;
                p.x *= RESOLUTION.x/RESOLUTION.y;
            
                vec3 ro = vec3(0.0, 10.0, 0.0);
                vec3 ww = normalize(vec3(0.0, -0.1, 1.0));
                vec3 uu = normalize(cross( vec3(0.0,1.0,0.0), ww));
                vec3 vv = normalize(cross(ww,uu));
                vec3 rd = normalize(p.x*uu + p.y*vv + 2.5*ww);
            
                vec3 col = render(ro, rd);
            
                gl_FragColor = vec4(col, 1.0);
            }
        `;
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    render() {
        const gl = this.gl;
        const time = (Date.now() - this.startTime) / 1000.0;
        
        gl.useProgram(this.program);
        gl.uniform1f(this.iTimeLocation, time);
        gl.uniform2f(this.iResolutionLocation, this.canvas.width, this.canvas.height);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(() => this.render());
    }
}

// Initialize portfolio when page loads
window.addEventListener('load', () => {
    new ShaderBackground();
    new Portfolio();
});