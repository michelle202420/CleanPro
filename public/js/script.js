// ===================================
// Language Switcher
// ===================================

// Get current language from localStorage or default to 'en'
let currentLang = localStorage.getItem('language') || 'en';

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
    initMobileMenu();
    initContactForm();
});

function initLanguage() {
    // Set active language button
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        if (btn.dataset.lang === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        // Add click event listener
        btn.addEventListener('click', function() {
            switchLanguage(this.dataset.lang);
        });
    });
    
    // Apply current language to all elements
    applyLanguage(currentLang);
}

function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('language', lang);
    
    // Update active button
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Apply language to all elements
    applyLanguage(lang);
}

function applyLanguage(lang) {
    // Update all elements with data-en and data-sk attributes
    const elements = document.querySelectorAll('[data-en][data-sk]');
    
    elements.forEach(element => {
        const text = element.getAttribute(`data-${lang}`);
        if (text) {
            // Check if it's an input/textarea placeholder
            if (element.hasAttribute(`data-placeholder-${lang}`)) {
                element.placeholder = element.getAttribute(`data-placeholder-${lang}`);
            } else {
                element.textContent = text;
            }
        }
    });
    
    // Update select options
    const selectOptions = document.querySelectorAll('option[data-en][data-sk]');
    selectOptions.forEach(option => {
        const text = option.getAttribute(`data-${lang}`);
        if (text) {
            option.textContent = text;
        }
    });
    
    // Update input placeholders
    const inputs = document.querySelectorAll('input[data-placeholder-en][data-placeholder-sk]');
    inputs.forEach(input => {
        const placeholder = input.getAttribute(`data-placeholder-${lang}`);
        if (placeholder) {
            input.placeholder = placeholder;
        }
    });
    
    // Update textarea placeholders
    const textareas = document.querySelectorAll('textarea[data-placeholder-en][data-placeholder-sk]');
    textareas.forEach(textarea => {
        const placeholder = textarea.getAttribute(`data-placeholder-${lang}`);
        if (placeholder) {
            textarea.placeholder = placeholder;
        }
    });
    
    // Update form labels
    const labels = document.querySelectorAll('label[data-en][data-sk]');
    labels.forEach(label => {
        const text = label.getAttribute(`data-${lang}`);
        if (text) {
            label.textContent = text;
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
}

// ===================================
// Mobile Menu Toggle
// ===================================

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger icon
            const spans = hamburger.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navMenu.contains(event.target);
            const isClickOnHamburger = hamburger.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnHamburger && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                const spans = hamburger.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
}

// ===================================
// Contact Form Handling
// ===================================

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                company: document.getElementById('company').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                service: document.getElementById('service').value,
                frequency: document.getElementById('frequency').value,
                message: document.getElementById('message').value,
                privacyConsent: document.getElementById('privacy-consent').checked ? 'true' : 'false'
            };
            
            // Validate form
            if (!formData.name || !formData.email || !formData.phone || !formData.service) {
                alert(currentLang === 'en'
                    ? 'Please fill in all required fields.'
                    : 'Prosím vyplňte všetky povinné polia.');
                return;
            }
            
            // Validate privacy consent
            if (formData.privacyConsent !== 'true') {
                alert(currentLang === 'en'
                    ? 'Please agree to the Privacy Policy to continue.'
                    : 'Prosím súhlaste so zásadami ochrany osobných údajov, aby ste mohli pokračovať.');
                return;
            }
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                alert(currentLang === 'en'
                    ? 'Please enter a valid email address.'
                    : 'Prosím zadajte platnú emailovú adresu.');
                return;
            }
            
            // Disable submit button
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = currentLang === 'en' ? 'Sending...' : 'Odosielam...';
            
            try {
                // Send data to backend API
                const apiUrl = `${window.location.origin}/api/quotes/submit`;
                console.log('Submitting to:', apiUrl);
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('Quote submitted successfully:', data);
                    
                    // Hide form and show success message
                    contactForm.style.display = 'none';
                    const successMessage = document.getElementById('formSuccess');
                    if (successMessage) {
                        successMessage.style.display = 'block';
                        
                        // Update success message with quote number if available
                        const quoteNumber = data.data?.quoteNumber || data.quoteNumber;
                        if (quoteNumber) {
                            const quoteNumberElement = successMessage.querySelector('.quote-number');
                            if (quoteNumberElement) {
                                quoteNumberElement.textContent = quoteNumber;
                            }
                        }
                    }
                    
                    // Scroll to success message
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    throw new Error(data.error || 'Failed to submit quote request');
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert(currentLang === 'en'
                    ? 'An error occurred. Please try again or contact us directly.'
                    : 'Vyskytla sa chyba. Prosím skúste znova alebo nás kontaktujte priamo.');
                
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

// ===================================
// Smooth Scrolling for Anchor Links
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            const target = document.querySelector(href);
            
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ===================================
// Add animation on scroll (optional enhancement)
// ===================================

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function handleScrollAnimation() {
    const animatedElements = document.querySelectorAll('.service-card, .feature, .step, .value-card, .why-item, .faq-item');
    
    animatedElements.forEach(element => {
        if (isElementInViewport(element)) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
}

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.service-card, .feature, .step, .value-card, .why-item, .faq-item');
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    // Initial check
    handleScrollAnimation();
    
    // Check on scroll
    window.addEventListener('scroll', handleScrollAnimation);
});

// ===================================
// Form Field Validation Feedback
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    const formInputs = document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = '#ef4444';
            } else if (this.type === 'email' && this.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(this.value)) {
                    this.style.borderColor = '#ef4444';
                } else {
                    this.style.borderColor = '#10b981';
                }
            } else if (this.value.trim()) {
                this.style.borderColor = '#10b981';
            } else {
                this.style.borderColor = '';
            }
        });
        
        input.addEventListener('focus', function() {
            this.style.borderColor = '#2563eb';
        });
    });
});

// ===================================
// Utility: Log for debugging
// ===================================

console.log('CleanPro Website - JavaScript Loaded Successfully');
console.log('Current Language:', currentLang);

// Made with Bob
