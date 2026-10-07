let casesData = { firstPart: [], geometry: [], secondPart: [] };

document.addEventListener("DOMContentLoaded", async () => {
    // Находим все элементы интерфейса
    const mainMenu = document.getElementById('mainMenu');
    const rouletteScreen = document.getElementById('rouletteScreen');
    const upgraderScreen = document.getElementById('upgraderScreen');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const currentCaseTitle = document.getElementById('currentCaseTitle');
    const tape = document.getElementById('tape');
    const spinBtn = document.getElementById('spinBtn');
    const modal = document.getElementById('modal');
    const modalTask = document.getElementById('modalTask');
    const closeBtn = document.getElementById('closeBtn');
    const userAnswerInput = document.getElementById('userAnswerInput');
    const submitAnswerBtn = document.getElementById('submitAnswerBtn');
    const answerResultStatus = document.getElementById('answerResultStatus');
    const inventoryGrid = document.getElementById('inventoryGrid');
    const emptyText = document.getElementById('emptyText');
    const answerSection = document.getElementById('answerSection');
    const winSound = document.getElementById('localWinSound');

    const navMenuBtn = document.getElementById('navMenuBtn');
    const navUpgradeBtn = document.getElementById('navUpgradeBtn');
    const upgraderInventoryList = document.getElementById('upgraderInventoryList');
    const upgraderTargetsList = document.getElementById('upgraderTargetsList');
    const chancePercentDisplay = document.getElementById('chancePercentDisplay');
    const upgradeActionBtn = document.getElementById('upgradeActionBtn');
    const upgradeStatusText = document.getElementById('upgradeStatusText');

    // Системные переменные игры
    const tickPoolSize = 6;
    const tickPool = [];
    let currentPoolIndex = 0;
    let activeCasePool = [];
    let currentWinnerTask = null; 
    let userInventory = [];
    let isUpgradeGame = false;
    let selectedInventoryItem = null;
    let selectedTargetItem = null;
    let selectedInventoryIndex = null;

    const CARD_WIDTH = 280; 
    const TOTAL_CARDS = 60;  
    let generatedCards = [];

    // Создаем аудио-пул
    for (let i = 0; i < tickPoolSize; i++) {
        const audio = new Audio('tick.mp3');
        audio.preload = 'auto';
        tickPool.push(audio);
    }

    // ЖЕСТКИЙ И СТАБИЛЬНЫЙ FETCH: ждем полной загрузки JSON перед тем, как включить кнопки
       try {
        // Хак: берем текущий путь к сайту и склеиваем его с именем файла
        const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const jsonUrl = window.location.origin + currentPath + 'tasks.json';
        
        console.log("Пытаюсь скачать базу отсюда:", jsonUrl);
        
        const response = await fetch(jsonUrl);
        casesData = await response.json();
        console.log("База данных успешно загружена из JSON!", casesData);
    } catch (err) {
        console.error("Критическая ошибка загрузки JSON!", err);
    }
// ==========================================
// БЛОК 2: ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ И ВЫБОР КЕЙСОВ
// ==========================================
    // Переключение экранов (Кейсы / Апгрейдер)
    if (navMenuBtn && navUpgradeBtn) {
        navMenuBtn.addEventListener('click', () => {
            navMenuBtn.classList.add('active');
            navUpgradeBtn.classList.remove('active');
            mainMenu.classList.remove('hidden');
            upgraderScreen.classList.add('hidden');
            rouletteScreen.classList.add('hidden');
        });
        navUpgradeBtn.addEventListener('click', () => {
            navUpgradeBtn.classList.add('active');
            navMenuBtn.classList.remove('active');
            upgraderScreen.classList.remove('hidden');
            mainMenu.classList.add('hidden');
            rouletteScreen.classList.add('hidden');
            renderUpgraderInventory();
            renderUpgraderTargets();
            calculateUpgradeChance();
        });
    }

    // Выбор кейса в главном лобби
    document.querySelectorAll('.case-card').forEach(card => {
        card.addEventListener('click', () => {
            const caseType = card.getAttribute('data-case-type');
            
            // Жесткая проверка: если JSON файл еще не успел прочитаться сервером Гитхаба
            if (!casesData || !casesData[caseType] || casesData[caseType].length === 0) {
                alert("Секунду, база данных задач подгружается сервером! Попробуй еще раз.");
                return;
            }

            activeCasePool = casesData[caseType];
            
            const caseNames = { firstPart: "ПЕРВАЯ ЧАСТЬ", geometry: "ГЕОМЕТРИЯ", secondPart: "ВТОРАЯ ЧАСТЬ" };
            currentCaseTitle.innerText = `КЕЙС: ${caseNames[caseType]}`;

            mainMenu.classList.add('hidden');
            rouletteScreen.classList.remove('hidden');
            
            // Принудительный сброс анимаций ленты
            isUpgradeGame = false;
            tape.style.transition = 'none';
            tape.style.transform = 'translateX(0px)';
            spinBtn.disabled = false;
            
            createTape(); // Теперь массив гарантированно есть, рулетка создастся без осечек
        });
    });

    // Кнопка Назад из экрана рулетки в главное лобби
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            rouletteScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            tape.style.transition = 'none';
            tape.style.transform = 'translateX(0px)';
            spinBtn.disabled = false;
        });
    }
// ==========================================
// БЛОК 3: ЛОГИКА РУЛЕТКИ КЕЙСОВ И ПРОВЕРКА ОТВЕТОВ
// ==========================================
    function getRandomTaskByWeight() {
        const totalWeight = activeCasePool.reduce((sum, task) => sum + task.weight, 0);
        let randomNum = Math.random() * totalWeight;
        for (let i = 0; i < activeCasePool.length; i++) {
            if (randomNum < activeCasePool[i].weight) return activeCasePool[i];
            randomNum -= activeCasePool[i].weight;
        }
        return activeCasePool; 
    }

    function createTape() {
        tape.innerHTML = '';
        generatedCards = [];
        for (let i = 0; i < TOTAL_CARDS; i++) {
            const weightedTask = getRandomTaskByWeight();
            generatedCards.push(weightedTask);
            const card = document.createElement('div');
            card.className = `card ${weightedTask.color}`;
            
            // Настройка текста ярлыка редкости
            let badgeText = 'КЕЙС';
            if (weightedTask.color === 'red') badgeText = '💥 ТАЙНОЕ';
            if (weightedTask.color === 'gold') badgeText = '👑 НОЖ';
            if (weightedTask.color === 'white') badgeText = 'ШИРПОТРЕБ';
            if (weightedTask.color === 'lightblue') badgeText = 'ПРОМЫШЛЕННОЕ';

            card.innerHTML = `
                <span class="type-name">${weightedTask.type}</span>
                <span class="math-preview" style="margin: 15px 0;">${weightedTask.short}</span>
                <span class="type-name" style="font-size:0.6rem; color: #888;">${badgeText}</span>
            `;
            tape.appendChild(card);
        }
    }

    function playPooledTick() {
        const sound = tickPool[currentPoolIndex];
        sound.currentTime = 0; sound.play().catch(()=>{});
        currentPoolIndex = (currentPoolIndex + 1) % tickPoolSize;
    }

    spinBtn.addEventListener('click', () => {
        spinBtn.disabled = true;
        tape.style.transition = 'none';
        tape.style.transform = 'translateX(0px)';
        
        // Сброс окон стандартной проверки
        userAnswerInput.value = "";
        answerResultStatus.innerText = "";
        submitAnswerBtn.disabled = false;
        
        // СБРОС ОКОН САМОПРОВЕРКИ ДЛЯ 2 ЧАСТИ
        document.getElementById('manualAnswerDisplay').classList.add('hidden');
        document.getElementById('honestyButtons').classList.add('hidden');
        document.getElementById('showManualAnswerBtn').classList.remove('hidden');

        playPooledTick();
        setTimeout(playPooledTick, 15);
        setTimeout(playPooledTick, 30);
        if(winSound) { winSound.currentTime = 0; winSound.play().catch(()=>{}); winSound.pause(); }

        setTimeout(() => {
            const winnerIndex = Math.floor(Math.random() * 7) + 45;
            currentWinnerTask = generatedCards[winnerIndex];
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
                if(winSound) { winSound.currentTime = 0; winSound.play().catch(()=>{}); }
                modalTask.innerHTML = currentWinnerTask.full;
                
                // ЛОГИКА ОПРЕДЕЛЕНИЯ ТИПА ПРОВЕРКИ
                const manualSection = document.getElementById('manualCheckSection');
                if (currentWinnerTask.answer === "manual") {
                    // Режим самопроверки для сложных параметров
                    answerSection.style.display = "none";
                    manualSection.classList.remove('hidden');
                    // Зашиваем текстовый развернутый ответ в скрытый блок
                    document.getElementById('manualAnswerDisplay').innerHTML = `<b>Правильный ответ:</b><br><br>${currentWinnerTask.manualAnswer || 'Ответ не указан в базе.'}`;
                } else {
                    // Обычный числовой режим для 1 части
                    answerSection.style.display = "flex";
                    manualSection.classList.add('hidden');
                }

                modal.style.display = 'flex';
            }, 5600);
        }, 50);
    });

    submitAnswerBtn.addEventListener('click', () => {
        const userTrimmedAnswer = userAnswerInput.value.trim().replace(',', '.');
        if (userTrimmedAnswer === "") {
            alert("Введи ответ!");
            return;
        }
        submitAnswerBtn.disabled = true;

        if (userTrimmedAnswer === currentWinnerTask.answer) {
            answerResultStatus.innerText = "🔥 КРАСАВА! ОТВЕТ ВЕРНЫЙ!";
            answerResultStatus.style.color = "#4b69ff";
            answerSection.style.display = "none";
            
            if (isUpgradeGame && selectedInventoryIndex !== null) {
                userInventory.splice(selectedInventoryIndex, 1);
                selectedInventoryItem = null;
                selectedInventoryIndex = null;
            }
            
            userInventory.push(currentWinnerTask);
            updateInventoryUI();
        } else {
            answerResultStatus.innerText = `❌ МИМО! Правильный ответ: ${currentWinnerTask.answer}. Предмет сгорел.`;
            answerResultStatus.style.color = "#ff4d4d";
            answerSection.style.display = "none";
            
            if (isUpgradeGame && selectedInventoryIndex !== null) {
                userInventory.splice(selectedInventoryIndex, 1);
                selectedInventoryItem = null;
                selectedInventoryIndex = null;
            }
            updateInventoryUI();
        }
    });

    const showManualAnswerBtn = document.getElementById('showManualAnswerBtn');
    const manualAnswerDisplay = document.getElementById('manualAnswerDisplay');
    const honestyButtons = document.getElementById('honestyButtons');

    if(showManualAnswerBtn) {
        showManualAnswerBtn.addEventListener('click', () => {
            showManualAnswerBtn.classList.add('hidden');
            manualAnswerDisplay.classList.remove('hidden');
            honestyButtons.classList.remove('hidden');
        });
    }

    // КНОПКА ЧЕСТНОСТИ: Да, я решил правильно (+1 в инвентарь)
    const honestyWinBtn = document.getElementById('honestyWinBtn');
    if(honestyWinBtn) {
        honestyWinBtn.addEventListener('click', () => {
            answerResultStatus.innerText = "🔥 ХОРОШО СРАБОТАНО! Задача зачислена в инвентарь.";
            answerResultStatus.style.color = "#4b69ff";
            document.getElementById('manualCheckSection').classList.add('hidden');
            
            // Если играли из апгрейдера — удаляем старый расходник
            if (isUpgradeGame && selectedInventoryIndex !== null) {
                userInventory.splice(selectedInventoryIndex, 1);
                selectedInventoryItem = null;
                selectedInventoryIndex = null;
            }
            
            userInventory.push(currentWinnerTask);
            updateInventoryUI();
        });
    }

    // КНОПКА ЧЕСТНОСТИ: Нет, я ошибся (Сгорает)
    const honestyLoseBtn = document.getElementById('honestyLoseBtn');
    if(honestyLoseBtn) {
        honestyLoseBtn.addEventListener('click', () => {
            answerResultStatus.innerText = "💥 Увы! Предмет сгорает. Попробуй прокачаться заново!";
            answerResultStatus.style.color = "#ff4d4d";
            document.getElementById('manualCheckSection').classList.add('hidden');
            
            if (isUpgradeGame && selectedInventoryIndex !== null) {
                userInventory.splice(selectedInventoryIndex, 1);
                selectedInventoryItem = null;
                selectedInventoryIndex = null;
            }
            updateInventoryUI();
        });
    }

    function updateInventoryUI() {
        if (userInventory.length > 0 && emptyText) emptyText.style.display = "none";
        if (userInventory.length === 0 && emptyText) emptyText.style.display = "block";
        inventoryGrid.querySelectorAll('.inventory-item').forEach(item => item.remove());

        userInventory.forEach(task => {
            const itemElement = document.createElement('div');
            itemElement.className = `inventory-item ${task.color}`;
            itemElement.innerHTML = `<span class="item-type">${task.type.split(' ')[0]} ${task.type.split(' ')[1] || ''}</span><span class="item-short">${task.short}</span><span style="font-size: 0.65rem; color: #ffb703; font-weight:bold;">🏆 РЕШЕНО</span>`;
            inventoryGrid.appendChild(itemElement);
        });
    }
// ==========================================
// БЛОК 4: ИНТЕРФЕЙС АПГРЕЙДЕРА И ХЕНДЛЕРЫ ЗАКРЫТИЯ
// ==========================================
    function renderUpgraderInventory() {
        upgraderInventoryList.innerHTML = '';
        if (userInventory.length === 0) {
            upgraderInventoryList.innerHTML = '<p class="empty-text">Инвентарь пуст. Выбей вещи в кейсах!</p>';
            return;
        }
        userInventory.forEach((task, idx) => {
            const item = document.createElement('div');
            item.className = `inventory-item ${task.color}`;
            if (selectedInventoryIndex === idx) item.classList.add('selected');
            item.innerHTML = `
                <span class="item-type">${task.type.split(' ') || ''}</span>
                <span class="item-short">${task.short}</span>
                <span style="font-size: 0.65rem; color: #aaa;">Ценность: ${task.value}</span>
            `;
            item.addEventListener('click', () => {
                selectedInventoryItem = task;
                selectedInventoryIndex = idx;
                renderUpgraderInventory();
                calculateUpgradeChance();
            });
            upgraderInventoryList.appendChild(item);
        });
    }

    function renderUpgraderTargets() {
        upgraderTargetsList.innerHTML = '';
        
        const allItems = [
            ...(casesData.firstPart || []),
            ...(casesData.geometry || []),
            ...(casesData.secondPart || [])
        ];
        
        if (allItems.length === 0) return;

        // СОРТИРОВКА: по возрастанию ранга редкости (от белого ранга 1 до золотого ранга 7)
        allItems.sort((a, b) => a.rank - b.rank);
        
        allItems.forEach(task => {
            const item = document.createElement('div');
            item.className = `target-item ${task.color}`;
            if (selectedTargetItem && selectedTargetItem.short === task.short) item.classList.add('selected');
            item.innerHTML = `
                <span class="item-type">${task.type.split(' ') || ''}</span>
                <span class="item-short">${task.short}</span>
                <span style="font-size: 0.65rem; color: #ffb703;">Требует: ${task.value}</span>
            `;
            item.addEventListener('click', () => {
                selectedTargetItem = task;
                renderUpgraderTargets();
                calculateUpgradeChance();
            });
            upgraderTargetsList.appendChild(item);
        });
    }

    function calculateUpgradeChance() {
        const ringFill = document.getElementById('ringFill');
        if (!selectedInventoryItem || !selectedTargetItem) {
            chancePercentDisplay.innerText = "0%";
            upgradeActionBtn.disabled = true;
            if(ringFill) ringFill.style.strokeDashoffset = 515.2;
            return;
        }

        let chance = (selectedInventoryItem.value / selectedTargetItem.value) * 100;
        
        // НАЛОГ КАЗИНА: урезаем максимальный шанс до 75% при крафте одинаковых грейдов
        if (selectedInventoryItem.value >= selectedTargetItem.value) {
            chance = 75;
        }

        if (chance < 1) chance = 1;
        chancePercentDisplay.innerText = chance.toFixed(1) + "%";
        upgradeActionBtn.disabled = false;

        if(ringFill) {
            const offset = 515.2 - (515.2 * chance) / 100;
            ringFill.style.strokeDashoffset = offset;
        }
    }

    if(upgradeActionBtn) {
        upgradeActionBtn.addEventListener('click', () => {
            if (!selectedInventoryItem || !selectedTargetItem) return;
            
            upgradeActionBtn.disabled = true;
            upgradeStatusText.innerText = "🎰 Крутим рулетку...";
            upgradeStatusText.style.color = "#ffb703";

            let chance = (selectedInventoryItem.value / selectedTargetItem.value) * 100;
            if (selectedInventoryItem.value >= selectedTargetItem.value) chance = 75;
            if (chance < 1) chance = 1;

            const radialPointer = document.getElementById('radialPointer');
            const finalAngle = Math.floor(Math.random() * 360);
            const totalRotation = 1440 + finalAngle;

            radialPointer.style.transition = 'transform 3s cubic-bezier(0.1, 0.8, 0.1, 1)';
            radialPointer.style.transform = `rotate(${totalRotation}deg)`;
            
            let tickCount = 0;
            const tickInterval = setInterval(() => {
                if(tickCount < 20) { playPooledTick(); tickCount++; } else { clearInterval(tickInterval); }
            }, 130);

            setTimeout(() => {
                const targetAngleLimit = (chance / 100) * 360;
                
                if (finalAngle <= targetAngleLimit) {
                    // ==========================================
                    // УСПЕХ АПГРЕЙДА!
                    // ==========================================
                    upgradeStatusText.innerText = "🎉 УСПЕХ! Реши задачу, чтобы забрать её!";
                    upgradeStatusText.style.color = "#4b69ff";
                    
                    setTimeout(() => {
                        currentWinnerTask = selectedTargetItem;
                        isUpgradeGame = true;
                        
                        userAnswerInput.value = "";
                        answerResultStatus.innerText = "";
                        submitAnswerBtn.disabled = false;

                        modalTask.innerHTML = currentWinnerTask.full;
                        
                        // ХАК ДЛЯ АПГРЕЙДЕРА: Автоматически переключаем режим проверки в модалке
                        const manualSection = document.getElementById('manualCheckSection');
                        if (currentWinnerTask.answer === "manual") {
                            // Если скрафтили параметр — включаем селф-чек
                            answerSection.style.display = "none";
                            manualSection.classList.remove('hidden');
                            document.getElementById('manualAnswerDisplay').innerHTML = `<b>Правильный ответ:</b><br><br>${currentWinnerTask.manualAnswer || 'Ответ не указан.'}`;
                        } else {
                            // Если скрафтили задачу из 1 части — оставляем инпут
                            answerSection.style.display = "flex";
                            manualSection.classList.add('hidden');
                        }

                        // Сброс кнопок отображения ответа
                        document.getElementById('manualAnswerDisplay').classList.add('hidden');
                        document.getElementById('honestyButtons').classList.add('hidden');
                        document.getElementById('showManualAnswerBtn').classList.remove('hidden');

                        modal.style.display = 'flex';
                        
                        radialPointer.style.transition = 'none';
                        radialPointer.style.transform = 'rotate(0deg)';
                    }, 1200);
                } else {
                    // ПРОИГРЫШ
                    upgradeStatusText.innerText = "💥 упс";
                    upgradeStatusText.style.color = "#ff4d4d";
                    
                    if (selectedInventoryIndex !== null) {
                        userInventory.splice(selectedInventoryIndex, 1);
                    }
                    
                    selectedInventoryItem = null;
                    selectedInventoryIndex = null;
                    
                    renderUpgraderInventory();
                    calculateUpgradeChance();
                    updateInventoryUI();
                    
                    setTimeout(() => {
                        radialPointer.style.transition = 'none';
                        radialPointer.style.transform = 'rotate(0deg)';
                    }, 1000);
                }
            }, 3100);
        });
    }

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        spinBtn.disabled = false;
        if (isUpgradeGame) {
            navUpgradeBtn.click();
        } else {
            createTape();
        }
    });
});