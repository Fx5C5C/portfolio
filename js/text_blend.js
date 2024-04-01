const texts = [" Hello! I'm David, a passionate Software Engineer with expertise in developing innovative solutions. I specialize in AI, mobile, and web technologies, striving to blend creativity with technology to push the boundaries of what's possible. Let's connect and explore new horizons together!", 
"Hallo! Ich bin David, ein leidenschaftlicher Software Engineer mit Erfahrung in der Entwicklung innovativer Lösungen. Ich bin auf KI-, Mobile- und Web-Technologien spezialisiert und strebe danach, Kreativität mit Technologie zu verbinden, um die Grenzen des Möglichen zu erweitern. Lasst uns zusammenarbeiten und gemeinsam neue Horizonte erkunden!"];
        let currentTextIndex = 0;

        function updateText() {
            const container = document.getElementsByClassName('biography')[0];
            container.innerHTML = '';
            const text = texts[currentTextIndex];
        
            text.split('').forEach(char => {
                const span = document.createElement('span');
                span.textContent = char;
                span.classList.add('character');
                container.appendChild(span);
            });

            // animate each character
            const characters = container.querySelectorAll('.character');
            characters.forEach((char, index) => {
                setTimeout(() => {
                    char.style.opacity = 1;
                }, index * 10); // stagger the animation
            });

            // Prepare for the next text
            currentTextIndex = (currentTextIndex + 1) % texts.length;
            setTimeout(updateText, 12000); // 2 minutes delay
        }

        // initial call
        updateText();