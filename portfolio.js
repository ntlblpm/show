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
            vec4 blackBackground = vec4(0.0, 0.0, 0.0, 0.6);
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
        
        this.projects = [
            {
                title: 'Project Alpha',
                description: 'A revolutionary web application built with modern technologies',
                tech: 'React, Node.js, WebGL',
                color: [0.2, 0.4, 0.8, 1.0],
                link: '#'
            },
            {
                title: 'Data Visualizer',
                description: 'Interactive data visualization platform for complex datasets',
                tech: 'D3.js, Python, PostgreSQL',
                color: [0.8, 0.2, 0.4, 1.0],
                link: '#'
            },
            {
                title: 'Mobile Experience',
                description: 'Native mobile app with seamless cross-platform functionality',
                tech: 'React Native, Firebase',
                color: [0.2, 0.8, 0.4, 1.0],
                link: '#'
            },
            {
                title: 'AI Assistant',
                description: 'Machine learning powered assistant for productivity',
                tech: 'TensorFlow, Python, AWS',
                color: [0.8, 0.4, 0.2, 1.0],
                link: '#'
            },
            {
                title: 'E-Commerce Platform',
                description: 'Scalable online marketplace with real-time features',
                tech: 'Next.js, Stripe, Redis',
                color: [0.4, 0.2, 0.8, 1.0],
                link: '#'
            },
            {
                title: 'Game Engine',
                description: 'Lightweight 2D game engine for browser-based games',
                tech: 'WebGL, TypeScript, WASM',
                color: [0.8, 0.8, 0.2, 1.0],
                link: '#'
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
                textTexture: null,
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
    }
    
    updateCardPositions() {
        const cols = 3;
        const padding = 80;
        const cardSpacing = 30;
        const maxCardWidth = 350;
        
        const availableWidth = this.canvas.width - padding * 2;
        const cardWidth = Math.min((availableWidth - cardSpacing * (cols - 1)) / cols, maxCardWidth);
        const cardHeight = cardWidth * 0.8;
        
        const totalWidth = cardWidth * cols + cardSpacing * (cols - 1);
        const startX = (this.canvas.width - totalWidth) / 2;
        
        const rows = Math.ceil(this.cards.length / cols);
        const totalHeight = cardHeight * rows + cardSpacing * (rows - 1);
        const startY = (this.canvas.height - totalHeight) / 2;
        
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
    
    setupEvents() {
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousemove', (e) => {
            // Disable hover when animating
            if (this.isAnimating) {
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
            
            if (this.hoveredCard) {
                if (this.expandedCard === this.hoveredCard) {
                    // Clicking on the expanded card - do nothing (don't close it)
                    return;
                } else {
                    // Opening a new card - dissolve others
                    this.expandedCard = this.hoveredCard;
                    this.lastExpandedCard = this.hoveredCard;
                    // Remove hover state from the clicked card
                    this.expandedCard.targetHover = 0;
                    this.cards.forEach(card => {
                        if (card !== this.expandedCard) {
                            card.targetCardDissolveProgress = 0.0; // Dissolve
                            card.cardDissolveStartTime = this.animationTime;
                            card.cardDissolveDelay = 0; // No stagger for dissolving out
                        }
                    });
                }
                this.updateCardPositions();
            } else if (this.expandedCard) {
                // Clicking outside - close expanded card and reverse dissolve
                this.lastExpandedCard = this.expandedCard;
                this.expandedCard = null;
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
        });
    }
    
    createTextTexture(card) {
        const canvas = this.textCanvas;
        const ctx = this.textCtx;
        const gl = this.gl;
        
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
        
        // Title - smoothly transition size and position
        const titleSize = 32 + (48 - 32) * expandProgress;
        const titleY = canvas.height * (0.5 - 0.3 * expandProgress);
        
        ctx.font = `${titleSize}px 'ProFontWindows', monospace`;
        ctx.fillStyle = 'white';
        ctx.fillText(card.project.title, canvas.width / 2, titleY);
        
        // Tech stack - fade out during expansion, move position
        const techOpacity = Math.max(0, 1 - expandProgress * 2);
        const techY = canvas.height * (0.7 - 0.1 * expandProgress);
        
        if (techOpacity > 0) {
            ctx.font = `${18}px 'ProFontWindows', monospace`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * techOpacity})`;
            ctx.fillText(card.project.tech, canvas.width / 2, techY);
        }
        
        // Description - fade in during expansion
        if (descriptionOpacity > 0) {
            ctx.font = `${24}px 'ProFontWindows', monospace`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * descriptionOpacity})`;
            
            // Wrap description
            const words = card.project.description.split(' ');
            let line = '';
            let y = canvas.height * 0.35;
            const lineHeight = 30;
            const maxWidth = canvas.width * 0.8;
            
            words.forEach(word => {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line, canvas.width / 2, y);
                    line = word + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            });
            ctx.fillText(line, canvas.width / 2, y);
            
            // Tech stack in expanded view
            ctx.font = `${20}px 'ProFontWindows', monospace`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * descriptionOpacity})`;
            ctx.fillText(card.project.tech, canvas.width / 2, canvas.height * 0.7);
        }
        
        // Update texture
        gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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