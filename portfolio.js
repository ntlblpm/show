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
    uniform vec4 u_color;
    uniform float u_useTexture;
    uniform float u_hover;
    uniform float u_expand;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        vec4 solidColor = u_color;
        
        vec4 baseColor = mix(solidColor, texColor, u_useTexture);
        
        // Add hover effect
        float brightness = 1.0 + u_hover * 0.2;
        baseColor.rgb *= brightness;
        
        gl_FragColor = baseColor;
    }
`;

class Portfolio {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = this.canvas.getContext('webgl');
        
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
                textTexture: null
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
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * window.devicePixelRatio;
            const y = (e.clientY - rect.top) * window.devicePixelRatio;
            
            this.hoveredCard = null;
            this.cards.forEach(card => {
                if (x >= card.x && x <= card.x + card.width &&
                    y >= card.y && y <= card.y + card.height) {
                    this.hoveredCard = card;
                    card.targetHover = 1;
                } else {
                    card.targetHover = 0;
                }
            });
            
            this.canvas.style.cursor = this.hoveredCard ? 'pointer' : 'default';
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.hoveredCard) {
                if (this.expandedCard === this.hoveredCard) {
                    this.lastExpandedCard = this.expandedCard;
                    this.expandedCard = null;
                } else {
                    this.expandedCard = this.hoveredCard;
                    this.lastExpandedCard = this.hoveredCard;
                }
                this.updateCardPositions();
            } else if (this.expandedCard) {
                this.lastExpandedCard = this.expandedCard;
                this.expandedCard = null;
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
        
        ctx.font = `bold ${titleSize}px -apple-system, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.fillText(card.project.title, canvas.width / 2, titleY);
        
        // Tech stack - fade out during expansion, move position
        const techOpacity = Math.max(0, 1 - expandProgress * 2);
        const techY = canvas.height * (0.7 - 0.1 * expandProgress);
        
        if (techOpacity > 0) {
            ctx.font = `${18}px -apple-system, sans-serif`;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * techOpacity})`;
            ctx.fillText(card.project.tech, canvas.width / 2, techY);
        }
        
        // Description - fade in during expansion
        if (descriptionOpacity > 0) {
            ctx.font = `${24}px -apple-system, sans-serif`;
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
            ctx.font = `${20}px -apple-system, sans-serif`;
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
        
        // Update card animations
        this.cards.forEach(card => {
            card.x += (card.targetX - card.x) * 0.1;
            card.y += (card.targetY - card.y) * 0.1;
            card.width += (card.targetWidth - card.width) * 0.1;
            card.height += (card.targetHeight - card.height) * 0.1;
            card.hover += (card.targetHover - card.hover) * 0.1;
            card.expand += (card.targetExpand - card.expand) * 0.1;
        });
        
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
        
        gl.clearColor(0.05, 0.05, 0.1, 1.0);
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
            if (card !== topCard) {
                // Apply dimming to background color
                const dimmedColor = card.project.color.map((c, i) => 
                    i < 3 ? c * (1 - dimmingFactor) : c
                );
                
                // Draw card background
                this.drawRect(
                    card.x, card.y,
                    card.width, card.height,
                    dimmedColor,
                    card.hover,
                    card.expand,
                    false
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
                    true
                );
            }
        });
        
        // Draw the top card last
        if (topCard) {
            // Draw card background
            this.drawRect(
                topCard.x, topCard.y,
                topCard.width, topCard.height,
                topCard.project.color,
                topCard.hover,
                topCard.expand,
                false
            );
            
            // Draw text
            this.createTextTexture(topCard);
            this.drawRect(
                topCard.x, topCard.y,
                topCard.width, topCard.height,
                [1, 1, 1, 1],
                topCard.hover,
                topCard.expand,
                true
            );
        }
    }
    
    drawRect(x, y, width, height, color, hover, expand, useTexture) {
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
        
        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

// Initialize portfolio when page loads
window.addEventListener('load', () => {
    new Portfolio();
});