document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.getElementById('projectGrid');
    const contactForm = document.getElementById('contactForm');

    // Sample projects data
    let projects = [
        {
            title: 'AI Investment Bot',
            description: 'An AI-driven application that analyzes market data and suggests stock moves using reinforcement learning.',
            technologies: ['Python', 'TensorFlow', 'Flask'],
            image: 'images/ai-investment-bot-thumbnail.jpg',
            link: 'https://github.com/DowellHd/smart-stock-bot'
        }
    ];

    // Function to create a project card
    function createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.transition = 'transform 0.3s ease';
        card.innerHTML = `
            <img src="${project.image}" alt="${project.title}" style="width: 100%; border-radius: 5px;">
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <div class="technologies">
                ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
            <a href="${project.link}" target="_blank" class="project-link">View Project</a>
        `;
        card.addEventListener('mouseover', () => card.style.transform = 'scale(1.03)');
        card.addEventListener('mouseout', () => card.style.transform = 'scale(1)');
        return card;
    }

    // Function to render all projects
    function renderProjects() {
        projectGrid.innerHTML = '';
        projects.forEach(project => {
            projectGrid.appendChild(createProjectCard(project));
        });
    }

    // Contact form handling
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        // Here you would typically send this data to a server
        fetch('https://formspree.io/f/myzjydyv', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('Thank you for your message! You will hear back from me soon.');
            } else {
                alert('Oops! There was a problem sending your message.');
            }
        })
        .catch(error => {
            alert('Oops! There was a problem sending your message.');
        });
        contactForm.reset();
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });

    // Load projects from localStorage on page load
    const savedProjects = localStorage.getItem('portfolioProjects');
    if (savedProjects) {
        projects = JSON.parse(savedProjects);
    }

    // Initial render
    renderProjects();
});
