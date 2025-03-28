// WebSocket connection handling
let socket = null;
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');

function connectWebSocket() {
    try {
        socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            statusDot.classList.add('connected');
            statusText.textContent = '已连接';
        };

        socket.onclose = () => {
            statusDot.classList.remove('connected');
            statusText.textContent = '未连接';
            // Try to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            statusDot.classList.remove('connected');
            statusText.textContent = '连接错误';
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Handle incoming messages
                console.log('Received:', data);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
    } catch (error) {
        console.error('Connection error:', error);
        statusDot.classList.remove('connected');
        statusText.textContent = '连接错误';
    }
}

// Initial connection attempt
connectWebSocket();

// Initialize Reveal.js
Reveal.initialize({
    controls: true,
    progress: true,
    center: true,
    hash: true,
    fragments: true,
    transition: 'slide',
    autoPlayMedia: true
});

// 星星交互效果
document.querySelectorAll('.interactive-star').forEach(star => {
    star.addEventListener('click', function() {
        this.style.animation = 'rotate 1s ease-in-out';
        setTimeout(() => {
            this.style.animation = '';
        }, 1000);
    });
});
