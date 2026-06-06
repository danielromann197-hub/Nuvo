document.addEventListener('DOMContentLoaded', () => {
  // Register GSAP Plugin
  gsap.registerPlugin(ScrollTrigger);

  initHeaderScroll();
  initHeroScrub();
  initParallax();
  initStaggerReveals();
  initProcessPinning();
  initMobileMenu();
});

function initMobileMenu() {
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  const navLinksItems = document.querySelectorAll('.nav-link');

  if (!mobileMenuBtn || !navLinks) return;

  // Toggle menu open/close
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
    
    // Prevent scrolling when menu is open
    if (navLinks.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Close menu when clicking on a link
  navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenuBtn.classList.remove('active');
      navLinks.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  // Simple scroll class toggle, keeping it outside GSAP for performance
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

function initHeroScrub() {
  // Entrance animation for individual elements
  const heroContent = document.querySelectorAll('.hero h1, .hero p, .hero-buttons');
  
  if (heroContent.length > 0) {
    // Initial fade in
    gsap.fromTo(heroContent, 
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.15, ease: "power3.out", delay: 0.1 }
    );

    // Scrub out the entire container on scroll to prevent property conflicts
    gsap.to('.hero .container', {
      y: -100,
      autoAlpha: 0,
      scale: 0.95,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  }
}

function initParallax() {
  // Parallax effect on Work images
  const workImages = document.querySelectorAll('.work-item img');
  
  workImages.forEach(img => {
    // Initial reveal
    gsap.fromTo(img.parentElement, 
      { autoAlpha: 0, scale: 0.9 },
      { autoAlpha: 1, scale: 1, duration: 1, ease: "power3.out",
        scrollTrigger: {
          trigger: img.parentElement,
          start: "top 85%"
        }
      }
    );

    // Parallax movement
    gsap.to(img, {
      yPercent: 15, // Move image 15% of its height
      ease: "none",
      scrollTrigger: {
        trigger: img.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  });
}

function initStaggerReveals() {
  // Reveal arrays of elements (like Services cards, Insights cards)
  const revealContainers = [
    { trigger: '.services-grid', elements: '.services-grid .card' },
    { trigger: '#blog .grid-3', elements: '#blog .insight-card' }
  ];

  revealContainers.forEach(group => {
    const el = document.querySelector(group.trigger);
    if (el) {
      gsap.fromTo(group.elements, 
        { autoAlpha: 0, y: 50 },
        { 
          autoAlpha: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.15, 
          ease: "back.out(1.2)", 
          scrollTrigger: {
            trigger: group.trigger,
            start: "top 80%"
          }
        }
      );
    }
  });

  // Standard standalone reveal-up elements
  const standaloneReveals = document.querySelectorAll('.reveal-up:not(.hero h1):not(.hero p):not(.hero-buttons):not(.process-steps .step-item):not(.services-grid):not(.text-center.reveal-up)');
  
  standaloneReveals.forEach(el => {
    gsap.fromTo(el,
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%"
        }
      }
    );
  });
  
  // Section Headers
  const sectionHeaders = document.querySelectorAll('.text-center.reveal-up');
  sectionHeaders.forEach(el => {
    gsap.fromTo(el,
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%"
        }
      }
    );
  });
}

function initProcessPinning() {
  // Apple-style sticky scrub for the process steps
  const processSection = document.querySelector('#process');
  const steps = document.querySelectorAll('.step-item');
  
  if (!processSection || steps.length === 0) return;

  // We pin the process section, and scrub through the steps
  let tl = gsap.timeline({
    scrollTrigger: {
      trigger: processSection,
      start: "center center",
      end: "+=150%", // Keep it pinned for 1.5x the viewport height
      pin: true,
      scrub: 0.5, // Smooth scrubbing
      anticipatePin: 1
    }
  });

  // Start with all steps faded out and scaled down slightly
  gsap.set(steps, { autoAlpha: 0.2, scale: 0.9, y: 20 });

  // Animate each step sequentially
  steps.forEach((step, i) => {
    tl.to(step, {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: 1,
      ease: "power2.inOut"
    })
    .to(step, {
      autoAlpha: 0.2,
      scale: 0.95,
      y: -10,
      duration: 1,
      ease: "power2.inOut"
    }, "+=0.5"); // Wait a bit before fading out
  });
}
