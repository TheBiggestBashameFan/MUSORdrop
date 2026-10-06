document.addEventListener("DOMContentLoaded", () => {
    // Массив, куда загрузятся задачи из файла tasks.json
    let tasksDatabase = [];

    // Элементы навигации меню
    const mainMenu = document.getElementById('mainMenu');
    const rouletteScreen = document.getElementById('rouletteScreen');
    const startCaseBtn = document.getElementById('startCaseBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');

    // Элементы рулетки
    const tape = document.getElementById('tape');
    const spinBtn = document.getElementById('spinBtn');
    const modal = document.getElementById('modal');
    const modalTask = document.getElementById('modalTask');
    const closeBtn = document.getElementById('closeBtn');
    
    // Звуки
    const winSound = document.getElementById('localWinSound');
    const tickPoolSize = 6;
    const tickPool = [];
    let currentPoolIndex = 0;

    for (let i = 0; i < tickPoolSize; i++) {
        const audio = new Audio('tick.mp3');
        audio.preload = 'auto';
        tickPool.push(audio);
    }

    if (!tape || !spinBtn || !modal || !modalTask || !closeBtn) return;

    const CARD_WIDTH = 280; 
    const TOTAL_CARDS = 60;  
    let generatedCards = [];

    // --- ЗАГРУЗКА БАЗЫ ДАННЫХ ИЗ ФАЙЛА TASKS.JSON ---
    fetch('tasks.json')
        .then(response => response.json())
        .then(data => {
            tasksDatabase = data;
            console.log(`Успешно загружено задач: ${tasksDatabase.length}`);
        })
        .catch(error => {
            console.error('Ошибка загрузки tasks.json! Проверь, лежит ли файл в папке.', error);
        });
    // ------------------------------------------------

    if (startCaseBtn && mainMenu && rouletteScreen) {
        startCaseBtn.addEventListener('click', () => {
            if (tasksDatabase.length === 0) {
                alert("База данных задач ещё не загрузилась, подожди секунду!");
                return;
            }
            mainMenu.classList.add('hidden');
            rouletteScreen.classList.remove('hidden');
            createTape(); 
        });
    }

    if (backToMenuBtn && mainMenu && rouletteScreen) {
        backToMenuBtn.addEventListener('click', () => {
            rouletteScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            tape.style.transition = 'none';
            tape.style.transform = 'translateX(0px)';
            spinBtn.disabled = false;
        });
    }

    function getRandomTaskByWeight() {
        const totalWeight = tasksDatabase.reduce((sum, task) => sum + task.weight, 0);
        let randomNum = Math.random() * totalWeight;
        
        for (let i = 0; i < tasksDatabase.length; i++) {
            if (randomNum < tasksDatabase[i].weight) {
                return tasksDatabase[i];
            }
            randomNum -= tasksDatabase[i].weight;
        }
        return tasksDatabase[0]; 
    }

    function createTape() {
        tape.innerHTML = '';
        generatedCards = [];
        for (let i = 0; i < TOTAL_CARDS; i++) {
            const weightedTask = getRandomTaskByWeight();
            generatedCards.push(weightedTask);
            
            const card = document.createElement('div');
            card.className = `card ${weightedTask.color}`;
            card.innerHTML = `
                <span class="type-name">${weightedTask.type}</span>
                <span class="math-preview" style="margin: 15px 0;">${weightedTask.short}</span>
                <span class="type-name" style="font-size:0.6rem; color: #888;">${weightedTask.color === 'red' ? '💥 ТАЙНОЕ' : 'КЕЙС'}</span>
            `;
            tape.appendChild(card);
        }
    }

    function playPooledTick() {
        const sound = tickPool[currentPoolIndex];
        sound.currentTime = 0; 
        sound.play().catch(()=>{});
        currentPoolIndex = (currentPoolIndex + 1) % tickPoolSize;
    }

    spinBtn.addEventListener('click', () => {
        spinBtn.disabled = true;
        tape.style.transition = 'none';
        tape.style.transform = 'translateX(0px)';
        
        playPooledTick();
        setTimeout(playPooledTick, 15);
        setTimeout(playPooledTick, 30);
        
        if(winSound) { winSound.currentTime = 0; winSound.play().catch(()=>{}); winSound.pause(); }

        setTimeout(() => {
            const winnerIndex = Math.floor(Math.random() * 7) + 45;
            const winnerTask = generatedCards[winnerIndex];
            const wrapperWidth = document.querySelector('.roulette-wrapper').offsetWidth;
            const centerOffset = wrapperWidth / 2;
            
            const randomInnerOffset = Math.floor(Math.random() * 120) + 80; 
            const finalTargetX = -(winnerIndex * CARD_WIDTH - centerOffset + randomInnerOffset);
            
            tape.style.transition = 'transform 5.5s cubic-bezier(0.25, 0.1, 0.1, 1)';
            tape.style.transform = `translateX(${finalTargetX}px)`;
            
            let lastCardIndex = -1;
            let isSpinning = true;

            function checkTick() {
                if (!isSpinning) return;

                const tapeRect = tape.getBoundingClientRect();
                const wrapperRect = document.querySelector('.roulette-wrapper').getBoundingClientRect();
                
                const relativeX = (wrapperRect.left + (wrapperRect.width / 2)) - tapeRect.left;
                const currentCardIndex = Math.floor(relativeX / CARD_WIDTH);

                if (currentCardIndex !== lastCardIndex && currentCardIndex >= 0 && currentCardIndex < TOTAL_CARDS) {
                    lastCardIndex = currentCardIndex;
                    playPooledTick(); 
                }

                requestAnimationFrame(checkTick);
            }
            
            requestAnimationFrame(checkTick);
            
            setTimeout(() => {
                isSpinning = false; 

                if(winSound) {
                    winSound.currentTime = 0;
                    winSound.play().catch(()=>{});
                }

                modalTask.innerHTML = winnerTask.full;
                modal.style.display = 'flex';
                
                if (window.MathJax && window.MathJax.typesetPromise) {
                    MathJax.typesetPromise();
                }
            }, 5600);
        }, 50);
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        spinBtn.disabled = false;
        createTape();
    });
});
