document.addEventListener('DOMContentLoaded', () => {

    // --- Dark Mode Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    // Initialize theme
    let isDark = localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && prefersDarkScheme.matches);

    const applyTheme = (dark) => {
        if (dark) {
            document.body.classList.add('dark-theme');
            themeToggle.classList.remove('fa-moon');
            themeToggle.classList.add('fa-sun');
        } else {
            document.body.classList.remove('dark-theme');
            themeToggle.classList.remove('fa-sun');
            themeToggle.classList.add('fa-moon');
        }
    };

    applyTheme(isDark);

    themeToggle.addEventListener('click', () => {
        isDark = !isDark;
        applyTheme(isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const topNav = document.querySelector('.top-nav');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active class to clicked item
            item.classList.add('active');

            // Get target view id
            const targetId = item.getAttribute('data-target');

            // Hide all views
            views.forEach(view => {
                view.classList.remove('active');
            });

            // Show target view
            document.getElementById(targetId).classList.add('active');

            // Toggle top nav visibility based on view
            // In Report view, we might want to hide top nav for full camera experience
            if (targetId === 'view-report') {
                topNav.style.transform = 'translateY(-100%)';
                topNav.style.transition = 'transform 0.3s ease';
            } else {
                topNav.style.transform = 'translateY(0)';
            }
        });
    });

    // --- Map View Logic ---
    const btnReportHazard = document.getElementById('btn-report-hazard');
    if (btnReportHazard) {
        btnReportHazard.addEventListener('click', () => {
            // Trigger click on Report nav item
            const reportNavIcon = document.querySelector('.nav-item[data-target="view-report"]');
            if (reportNavIcon) reportNavIcon.click();
        });
    }

    // --- Report View Logic ---
    const setTimeField = () => {
        const timeField = document.getElementById('current-time');
        if (timeField) {
            const now = new Date();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeField.textContent = `${hours}:${minutes} ${ampm}, Today`;
        }
    };

    // Update time initially
    setTimeField();

    // Capture Button Animation Simulation
    const btnCapture = document.querySelector('.btn-capture');
    if (btnCapture) {
        btnCapture.addEventListener('click', () => {
            // Simple flash effect
            const preview = document.querySelector('.camera-preview');
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.bottom = '0';
            flash.style.left = '0';
            flash.style.right = '0';
            flash.style.backgroundColor = 'white';
            flash.style.opacity = '0.8';
            flash.style.zIndex = '10';
            flash.style.transition = 'opacity 0.2s';

            preview.appendChild(flash);

            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 200);
            }, 100);
        });
    }

    // Submit Report Simulation
    const btnSubmitReport = document.getElementById('btn-submit-report');
    if (btnSubmitReport) {
        btnSubmitReport.addEventListener('click', () => {
            const originalText = btnSubmitReport.textContent;
            btnSubmitReport.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            btnSubmitReport.style.opacity = '0.8';

            // Simulate network request
            setTimeout(() => {
                btnSubmitReport.innerHTML = '<i class="fa-solid fa-check"></i> Report Submitted!';
                btnSubmitReport.style.backgroundColor = 'var(--semantic-green)';
                btnSubmitReport.style.opacity = '1';

                // Reset after 2s and go to community to see points
                setTimeout(() => {
                    btnSubmitReport.textContent = originalText;
                    btnSubmitReport.style.backgroundColor = 'var(--primary-blue)';

                    const communityNav = document.querySelector('.nav-item[data-target="view-community"]');
                    if (communityNav) communityNav.click();
                }, 1500);
            }, 1000);
        });
    }

});
