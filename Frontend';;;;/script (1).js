/* ============================================
   FORMFORGE - Interactive Features
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    initializeNavbar();
    initializeButtons();
    initializeForm();
});

/* ============================================
   MODAL FUNCTIONALITY
   ============================================ */

function initializeModal() {
    const modal = document.getElementById('modal');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    
    // Get all CTA buttons
    const ctaButtons = [
        document.getElementById('navCtaBtn'),
        document.getElementById('heroCtaBtn'),
        document.getElementById('ctaCtaBtn')
    ];

    // Open modal on button click
    ctaButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', openModal);
        }
    });

    // Close modal on X click
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    // Close modal on overlay click
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    function openModal(e) {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Animate modal content
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.animation = 'none';
        setTimeout(() => {
            modalContent.style.animation = '';
        }, 10);
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/* ============================================
   NAVBAR SCROLL EFFECT
   ============================================ */

function initializeNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, false);
}

/* ============================================
   BUTTON INTERACTIONS
   ============================================ */

function initializeButtons() {
    const buttons = document.querySelectorAll('.btn, .nav-cta, .feature-card, .benefit-block, .social-links a');

    buttons.forEach(button => {
        // Add click ripple effect
        button.addEventListener('click', function(e) {
            // Don't add ripple if it's a CTA button that opens modal
            if (!this.id || !this.id.includes('Cta')) {
                createRipple(e);
            }
        });

        // Add hover sound effect (optional - requires audio file)
        button.addEventListener('mouseenter', function() {
            // Add visual feedback
            if (this.classList.contains('btn')) {
                this.style.transition = 'all 0.3s ease';
            }
        });
    });
}

function createRipple(event) {
    const button = event.currentTarget;
    
    // Only create ripple for certain button types
    if (!button.classList.contains('feature-card') && 
        !button.classList.contains('benefit-block') &&
        !button.classList.contains('social-links')) {
        return;
    }

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

/* ============================================
   FORM HANDLING
   ============================================ */

function initializeForm() {
    const form = document.querySelector('.signup-form');
    
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validate form
        if (!data.name || !data.email || !data.company) {
            showFormMessage('Please fill in all required fields', 'error');
            return;
        }

        // Validate email
        if (!isValidEmail(data.email)) {
            showFormMessage('Please enter a valid email address', 'error');
            return;
        }

        // Simulate form submission
        submitForm(form, data);
    });

    // Add input validation feedback
    form.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });

        input.addEventListener('focus', function() {
            this.style.boxShadow = 'inset 0 0 0 2px #ff006e';
        });
    });
}

function validateInput(input) {
    const value = input.value.trim();
    const isEmail = input.type === 'email';

    if (!value) {
        input.classList.add('error');
        return false;
    }

    if (isEmail && !isValidEmail(value)) {
        input.classList.add('error');
        return false;
    }

    input.classList.remove('error');
    return true;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function submitForm(form, data) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.style.opacity = '0.7';

    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.opacity = '1';

        // Show success message
        showFormMessage('Account created successfully! Check your email to get started.', 'success');

        // Reset form
        setTimeout(() => {
            form.reset();
            // Close modal
            document.getElementById('modal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }, 2000);
    }, 1500);
}

function showFormMessage(message, type) {
    const form = document.querySelector('.signup-form');
    let messageEl = form.querySelector('.form-message');

    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'form-message';
        form.insertBefore(messageEl, form.firstChild);
    }

    messageEl.textContent = message;
    messageEl.className = `form-message ${type}`;
    messageEl.style.display = 'block';
    messageEl.style.padding = '1rem';
    messageEl.style.marginBottom = '1rem';
    messageEl.style.borderRadius = '4px';
    messageEl.style.fontWeight = '600';
    messageEl.style.animation = 'slideDown 0.3s ease';

    if (type === 'success') {
        messageEl.style.background = '#d4edda';
        messageEl.style.color = '#155724';
        messageEl.style.border = '2px solid #28a745';
    } else {
        messageEl.style.background = '#f8d7da';
        messageEl.style.color = '#721c24';
        messageEl.style.border = '2px solid #f5c6cb';
    }

    if (type === 'success') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

/* ============================================
   INTERSECTION OBSERVER FOR ANIMATIONS
   ============================================ */

function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideUp 0.8s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .benefit-block').forEach(el => {
        observer.observe(el);
    });
}

// Initialize scroll animations when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScrollAnimations);
} else {
    initializeScrollAnimations();
}

/* ============================================
   SMOOTH SCROLL FOR NAVIGATION
   ============================================ */

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Don't prevent default for modal triggers
            if (href === '#' || this.id.includes('Cta')) {
                return;
            }

            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize smooth scroll
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSmoothScroll);
} else {
    initializeSmoothScroll();
}

/* ============================================
   UTILITY: CURSOR FOLLOW EFFECT (OPTIONAL)
   ============================================ */

function initializeCursorFollowEffect() {
    const shapes = document.querySelectorAll('.shape');
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;

        shapes.forEach((shape, index) => {
            const distance = 20 + index * 10;
            const x = (mouseX / window.innerWidth) * distance;
            const y = (mouseY / window.innerHeight) * distance;

            // Subtle cursor follow
            shape.style.transform = `translate(${x - distance / 2}px, ${y - distance / 2}px)`;
        });
    });
}

// Initialize cursor follow effect
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCursorFollowEffect);
} else {
    initializeCursorFollowEffect();
}

/* ============================================
   KEYBOARD SHORTCUTS
   ============================================ */

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to open modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const modal = document.getElementById('modal');
        if (!modal.classList.contains('active')) {
            document.getElementById('navCtaBtn').click();
        }
    }
});

/* ============================================
   PERFORMANCE: LAZY LOAD IMAGES
   ============================================ */

function initializeLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLazyLoad);
} else {
    initializeLazyLoad();
}

/* ============================================
   ACCESSIBILITY: FOCUS MANAGEMENT
   ============================================ */

function improveAccessibility() {
    // Add focus visible style for keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-nav');
    });
}

improveAccessibility();

/* ============================================
   ANALYTICS: TRACK USER INTERACTIONS
   ============================================ */

function trackEvent(eventName, eventData = {}) {
    if (window.gtag) {
        gtag('event', eventName, eventData);
    } else if (window.plausible) {
        plausible(eventName, { props: eventData });
    }
    // Fallback: log to console in development
    console.log(`📊 Event: ${eventName}`, eventData);
}

// Track CTA clicks
document.querySelectorAll('[id*="Cta"]').forEach(btn => {
    btn.addEventListener('click', () => {
        trackEvent('cta_click', { button: btn.id });
    });
});

// Track form submissions
document.querySelector('.signup-form')?.addEventListener('submit', () => {
    trackEvent('form_submit', { form: 'signup' });
});

console.log('✨ FORMFORGE initialized successfully!');
