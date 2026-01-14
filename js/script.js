document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.getElementById('projectGrid');
    const contactForm = document.getElementById('contactForm');

    // Projects data - SSB is featured in HTML, other projects go here
    let projects = [];

    // Function to create a project card
    function createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <img src="${project.image}" alt="${project.title}" class="project-image">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="technologies">
                ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            <a href="${project.link}" target="_blank" class="project-link">View Project</a>
        `;
        return card;
    }

    // Function to render all projects
    function renderProjects() {
        if (!projectGrid) return;
        projectGrid.innerHTML = '';
        projects.forEach(project => {
            projectGrid.appendChild(createProjectCard(project));
        });
    }

    // Contact form handling
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;

            try {
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';

                const formData = new FormData(contactForm);
                const response = await fetch('https://formspree.io/f/myzjydyv', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    alert('Thank you for your message! You will hear back from me soon.');
                    contactForm.reset();
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                alert('Oops! There was a problem sending your message. Please try again later.');
                console.error('Error:', error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Load projects from localStorage on page load
    const savedProjects = localStorage.getItem('portfolioProjects');
    if (savedProjects) {
        try {
            projects = JSON.parse(savedProjects);
        } catch (e) {
            console.error('Error parsing saved projects:', e);
        }
    }

    // Initial render
    renderProjects();
});
