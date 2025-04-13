// Define sections to load in order (正序排布)
// 顺序：介绍 -> 目录 -> 历史背景 -> 运动精神 -> 文化影响 -> 时代传承 -> 结语
const sections = [
    'intro',      // 介绍
    'toc',        // 目录
    'background', // 历史背景：从巴黎和会到青年觉醒
    'spirit',     // 运动精神：爱国、民主与科学启蒙
    'culture',    // 文化影响：新文化运动与思想变革
    'legacy',     // 时代传承：青年使命与民族复兴
    'conclusion'  // 结语
];

// Function to load sections
async function loadSections() {
    const slidesContainer = document.getElementById('presentation-slides');
    
    for (const section of sections) {
        try {
            const response = await fetch(`sections/${section}.html`);
            const html = await response.text();
            slidesContainer.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error(`Error loading section ${section}:`, error);
        }
    }

    // Initialize Reveal.js after all sections are loaded
    Reveal.initialize({
        controls: true,
        progress: true,
        center: true,
        hash: true,
        fragments: true,
        transition: 'slide',
        autoPlayMedia: true
    });

    // Initialize star interaction after content is loaded
    initializeStarInteraction();
}

// Star interaction functionality
function initializeStarInteraction() {
    document.querySelectorAll('.interactive-star').forEach(star => {
        star.addEventListener('click', function() {
            this.style.animation = 'rotate 1s ease-in-out';
            setTimeout(() => {
                this.style.animation = '';
            }, 1000);
        });
    });
}

// WebSocket connection handling
let socket = null;
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');

function connectWebSocket() {
    try {
        socket = new WebSocket('wss://your-secure-server-address:8080'); // 使用wss协议进行安全连接

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

// Start loading sections and initialize WebSocket connection
window.addEventListener('DOMContentLoaded', () => {
    loadSections();
    connectWebSocket();
});
