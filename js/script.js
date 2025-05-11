document.addEventListener('DOMContentLoaded', () => {
    const projectGrid = document.getElementById('projectGrid');
    const addProjectBtn = document.getElementById('addProjectBtn');
    const contactForm = document.getElementById('contactForm');

    // Sample projects data
    let projects = [
        {
            title: 'AI Investment Bot',
            description: 'An AI-driven application that analyzes market data and suggests stock moves using reinforcement learning.',
            technologies: ['Python', 'TensorFlow', 'Flask'],
            image: 'ai-investment-bot-thumbnail.jpg',
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

    // Add new project functionality
    addProjectBtn.addEventListener('click', () => {
        const newProject = {
            title: prompt('Enter project title:'),
            description: prompt('Enter project description:'),
            technologies: prompt('Enter technologies used (comma-separated):').split(',').map(tech => tech.trim()),
            image: prompt('Enter image URL (or leave blank for default):') || 'https://via.placeholder.com/300x200',
            link: prompt('Enter project link:')
        };

        if (newProject.title && newProject.description) {
            projects.push(newProject);
            renderProjects();
            // Save to localStorage
            localStorage.setItem('portfolioProjects', JSON.stringify(projects));
        }
    });

    // Contact form handling
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        // Here you would typically send this data to a server
        alert('Thank you for your message! This is a demo - in a real portfolio, this would send an email.');
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
