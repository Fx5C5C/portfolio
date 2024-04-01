// Import individual icons directly
import { createElement, Linkedin, Mail, Github, Instagram, User, CircleX } from 'lucide';

// Function to convert an icon to SVG and append it
function appendIcon(selector, icon, attributes = {}, hrefLink) {
    const svg = createElement(icon);
    svg.setAttribute = attributes;
    if (hrefLink == null) {
        document.querySelector(selector).appendChild(svg);
    } else {
        const contactLink = document.createElement('a');
        contactLink.href = hrefLink;
        contactLink.target = "_blank";
        contactLink.appendChild(svg);
        document.querySelector(selector).appendChild(contactLink);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.icons').innerHTML = '';

    appendIcon('.closebtn', CircleX, { 'stroke-width': 2, class: 'icon-class' });

    appendIcon('.icons', Linkedin, { 'stroke-width': 2, class: 'icon-class' }, "https://linkedin.com/in/david-dahncke");
    appendIcon('.icons', Mail, { 'stroke-width': 2, class: 'icon-class' }, "mailto:me@daviddahncke.com");
    appendIcon('.icons', Github, { 'stroke-width': 2, class: 'icon-class' }, "https://github.com/Fx5C5C");
    appendIcon('.icons', Instagram, { 'stroke-width': 2, class: 'icon-class' }, "https://www.instagram.com/david.dahncke");
});
