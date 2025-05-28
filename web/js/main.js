document.addEventListener('DOMContentLoaded', () => {
    // API endpoints
    const API = {
        AUTH: '/api/auth',
        PRESENTATIONS: '/api/presentations',
        USERS: '/api/users'
    };

    // Initialize user interface
    async function initializeUserInterface() {
        try {
            const response = await fetch(`${API.AUTH}/check`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.authenticated) {
                const loginBtn = document.querySelector('.login-btn');
                loginBtn.textContent = data.user.username;
                loginBtn.dataset.loggedIn = 'true';

                // Set theme preference
                document.documentElement.setAttribute('data-theme', data.user.theme || 'light');

                // Load view history
                await loadRecentViews();
            }
        } catch (error) {
            console.error('Error initializing interface:', error);
        }
    }

    // Load recently viewed presentations
    async function loadRecentViews() {
        try {
            const response = await fetch(`${API.PRESENTATIONS}/history/user`, {
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status !== 401) {
                    console.error('Error fetching view history');
                }
                return;
            }

            const data = await response.json();
            const recentlyViewedSection = document.getElementById('recentlyViewed');
            const recentGrid = recentlyViewedSection.querySelector('.recent-grid');
            const template = document.getElementById('recentItemTemplate');

            if (data.length === 0) {
                recentlyViewedSection.style.display = 'none';
                return;
            }

            recentGrid.innerHTML = '';
            recentlyViewedSection.style.display = 'block';

            data.forEach(item => {
                const clone = template.content.cloneNode(true);
                const link = clone.querySelector('.recent-link');
                const title = clone.querySelector('.title');
                const time = clone.querySelector('.view-time');

                link.href = item.slug.includes('?') ? 
                    `sections/toc.html?presentation=${item.slug}` : 
                    `sections/${item.slug}.html`;
                title.textContent = item.title;

                // Format the timestamp
                const viewDate = new Date(item.viewed_at);
                const now = new Date();
                const diffInHours = (now - viewDate) / (1000 * 60 * 60);
                
                let timeText;
                if (diffInHours < 1) {
                    timeText = '刚刚';
                } else if (diffInHours < 24) {
                    timeText = `${Math.floor(diffInHours)}小时前`;
                } else {
                    timeText = `${Math.floor(diffInHours / 24)}天前`;
                }
                
                time.textContent = timeText;
                recentGrid.appendChild(clone);
            });
        } catch (error) {
            console.error('Error loading recent views:', error);
        }
    }

    // Track presentation views
    async function trackPresentationView(presentationId) {
        try {
            const response = await fetch(`${API.PRESENTATIONS}/history/${presentationId}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to record view');
            }

            // Reload recent views
            await loadRecentViews();
        } catch (error) {
            console.error('Error tracking view:', error);
        }
    }

    // Update theme preference
    async function updateThemePreference(theme) {
        try {
            const response = await fetch(`${API.USERS}/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to update theme preference');
            }

            document.documentElement.setAttribute('data-theme', theme);
        } catch (error) {
            console.error('Error updating theme:', error);
        }
    }

    // Utility functions
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Mobile menu handling
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        hamburger.setAttribute('aria-expanded', 
            hamburger.getAttribute('aria-expanded') === 'false' ? 'true' : 'false'
        );
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('active') && 
            !navLinks.contains(e.target) && 
            !hamburger.contains(e.target)) {
            navLinks.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });

    // Navigation active state management
    const navLinkElements = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section');

    // Update active nav link based on scroll position
    const updateActiveNavLink = throttle(() => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    }, 100);

    // Smooth scroll to sections
    navLinkElements.forEach(link => {
        if (!link.classList.contains('login-btn') && !link.classList.contains('register-btn')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').slice(1);
                const targetSection = document.getElementById(targetId);
                
                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }

                window.scrollTo({
                    top: targetSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            });
        }
    });

    // CTA button scroll to presentations
    const ctaButton = document.querySelector('.cta-button');
    ctaButton.addEventListener('click', () => {
        const presentationsSection = document.getElementById('slides');
        window.scrollTo({
            top: presentationsSection.offsetTop - 70,
            behavior: 'smooth'
        });
    });

    // Add throttled scroll event listener
    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink();

    // Form validation utilities
    const validators = {
        username: (value) => {
            const regex = /^[a-zA-Z0-9_-]{3,20}$/;
            return {
                isValid: regex.test(value),
                message: '用户名应为3-20个字符，只能包含字母、数字、下划线和连字符'
            };
        },
        email: (value) => {
            const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return {
                isValid: regex.test(value),
                message: '请输入有效的电子邮箱地址'
            };
        },
        password: (value) => ({
            isValid: value.length >= 6,
            message: '密码必须至少包含6个字符'
        }),
        confirmPassword: (value, password) => ({
            isValid: value === password,
            message: '两次输入的密码不匹配'
        })
    };

    function validateField(input, validatorName, compareValue) {
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.error');
        const value = input.value.trim();
        
        const validation = validators[validatorName](value, compareValue);
        
        formGroup.classList.remove('error', 'success');
        formGroup.classList.add(validation.isValid ? 'success' : 'error');
        
        if (errorElement) {
            errorElement.textContent = validation.isValid ? '' : validation.message;
        }
        
        return validation.isValid;
    }

    // Setup form validation
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // Register form field validation
    const regUsername = document.getElementById('reg-username');
    const regEmail = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');
    const regConfirmPassword = document.getElementById('reg-confirm-password');

    regUsername.addEventListener('input', () => validateField(regUsername, 'username'));
    regEmail.addEventListener('input', () => validateField(regEmail, 'email'));
    regPassword.addEventListener('input', () => {
        validateField(regPassword, 'password');
        if (regConfirmPassword.value) {
            validateField(regConfirmPassword, 'confirmPassword', regPassword.value);
        }
    });
    regConfirmPassword.addEventListener('input', () => 
        validateField(regConfirmPassword, 'confirmPassword', regPassword.value)
    );

    // Login form field validation
    const loginUsername = document.getElementById('username');
    const loginPassword = document.getElementById('password');

    loginUsername.addEventListener('input', () => validateField(loginUsername, 'username'));
    loginPassword.addEventListener('input', () => validateField(loginPassword, 'password'));

    // Modal functionality
    const loginBtn = document.querySelector('.login-btn');
    const registerBtn = document.querySelector('.register-btn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeBtns = document.querySelectorAll('.close-btn');

    function toggleModal(modal) {
        modal.classList.toggle('active');
        document.body.style.overflow = modal.classList.contains('active') ? 'hidden' : '';
        
        if (!modal.classList.contains('active')) {
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                form.querySelectorAll('.form-group').forEach(group => {
                    group.classList.remove('error', 'success');
                });
            }
        }
    }

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginBtn.dataset.loggedIn !== 'true') {
            toggleModal(loginModal);
        }
    });

    registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModal(registerModal);
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleModal(btn.closest('.modal'));
        });
    });

    [loginModal, registerModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                toggleModal(modal);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                toggleModal(activeModal);
            }
        }
    });

    // Form submission handlers
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isUsernameValid = validateField(regUsername, 'username');
        const isEmailValid = validateField(regEmail, 'email');
        const isPasswordValid = validateField(regPassword, 'password');
        const isConfirmPasswordValid = validateField(regConfirmPassword, 'confirmPassword', regPassword.value);

        if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
            return;
        }

        const submitBtn = registerForm.querySelector('.submit-btn');
        
        try {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const response = await fetch(`${API.AUTH}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: regUsername.value.trim(),
                    email: regEmail.value.trim(),
                    password: regPassword.value
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '注册失败');
            }

            alert('注册成功！请登录');
            toggleModal(registerModal);
            toggleModal(loginModal);

        } catch (error) {
            alert(error.message || '注册失败，请稍后重试！');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isUsernameValid = validateField(loginUsername, 'username');
        const isPasswordValid = validateField(loginPassword, 'password');

        if (!isUsernameValid || !isPasswordValid) {
            return;
        }

        const submitBtn = loginForm.querySelector('.submit-btn');
        
        try {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const response = await fetch(`${API.AUTH}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: loginUsername.value.trim(),
                    password: loginPassword.value
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '登录失败');
            }

            alert('登录成功！');
            toggleModal(loginModal);
            loginBtn.textContent = data.user.username;
            loginBtn.dataset.loggedIn = 'true';
            
            // Update UI with user data
            document.documentElement.setAttribute('data-theme', data.user.theme || 'light');
            await loadRecentViews();

        } catch (error) {
            alert(error.message || '登录失败，请稍后重试！');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    // Handle logout
    loginBtn.addEventListener('click', async (e) => {
        if (loginBtn.dataset.loggedIn === 'true') {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                loginBtn.classList.add('loading');
                
                const response = await fetch(`${API.AUTH}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    loginBtn.textContent = '登录';
                    loginBtn.dataset.loggedIn = 'false';
                    
                    // Hide recently viewed section
                    document.getElementById('recentlyViewed').style.display = 'none';
                    
                    alert('已成功退出登录');
                } else {
                    throw new Error('登出失败');
                }
            } catch (error) {
                alert('退出登录失败，请稍后重试');
            } finally {
                loginBtn.classList.remove('loading');
            }
        }
    });

    // Track presentation views
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const href = btn.getAttribute('href');
            const presentationId = href.includes('?') ? 
                href.split('?')[1].split('=')[1] : 
                href.split('/').pop().split('.')[0];
            
            trackPresentationView(presentationId);
        });
    });

    // Add hover effects to presentation cards
    const presentationCards = document.querySelectorAll('.presentation-card');
    presentationCards.forEach(card => {
        const debouncedHover = debounce((transform) => {
            card.style.transform = transform;
        }, 50);

        card.addEventListener('mouseenter', () => {
            debouncedHover('translateY(-5px)');
        });
        
        card.addEventListener('mouseleave', () => {
            debouncedHover('translateY(0)');
        });
    });

    // Initialize the interface
    initializeUserInterface();
});
