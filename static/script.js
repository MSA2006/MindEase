// Global state
        let currentUser = null;
        let allEntries = [];
        let currentSearchTerm = "";
        let isEntriesVisible = false;
        let editingEntryId = null;

        // DOM Elements
        const authContainer = document.getElementById('auth-container');
        const mainApp = document.getElementById('main-app');
        const alertContainer = document.getElementById('alert-container');

        // Original app elements
        const saveButton = document.getElementById("saveEntryBtn");
        const textarea = document.getElementById("journal-textarea");
        const toggleBtn = document.getElementById("toggleBtn");
        const entriesContainer = document.getElementById("entriesContainer");
        const searchInput = document.getElementById("searchInput");
        const searchInfo = document.getElementById("searchInfo");
        const clearSearchBtn = document.getElementById("clearSearch");
        const entryDisplay = document.getElementById("entryDisplay");
        const modeToggle = document.getElementById("modeToggle");
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const soundToggle = document.getElementById('sound-toggle');
        const soundButtons = document.getElementById('sound-buttons');

        // Sound setup (using basic audio data for demo)
        const sounds = {
            rain: new Audio('rain.mp3'),
            waves: new Audio('waves.mp3'),
            birds: new Audio('birds.mp3'),
            wind: new Audio('wind.mp3')
        };

        Object.values(sounds).forEach(sound => {
            sound.loop = true;
            sound.volume = 0.5;
        });

        const playing = {};

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            setupAuthSystem();
            setupOriginalApp();
            checkAuthStatus();
            loadQuote();
        });

        // ================= AUTHENTICATION SYSTEM ================= 
        function setupAuthSystem() {
            setupAuthTabs();
            setupAuthForms();
            setupPasswordToggles();
        }

        function setupAuthTabs() {
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetTab = tab.dataset.tab;
                    
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    forms.forEach(f => f.classList.remove('active'));
                    document.getElementById(`${targetTab}-form`).classList.add('active');
                    
                    clearAlerts();
                });
            });
        }

        function setupPasswordToggles() {
            document.querySelectorAll('.password-toggle').forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = toggle.getAttribute('data-target');
                    const input = document.getElementById(targetId);
                    
                    if (input.type === 'password') {
                        input.type = 'text';
                        toggle.textContent = '🙈';
                    } else {
                        input.type = 'password';
                        toggle.textContent = '👁️';
                    }
                });
            });
        }

        function setupAuthForms() {
    // Login form - FIXED to call real backend
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();
        
        if (!username || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
        
        try {
            // CALL REAL BACKEND API
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                currentUser = result.user;
                showAlert(result.message, 'success');
                setTimeout(() => {
                    showMainApp();
                    loadUserData();
                }, 1000);
            } else {
                showAlert(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Connection error. Make sure the backend is running!', 'error');
        }
    });

    // Register form - FIXED to call real backend  
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        const confirmPassword = document.getElementById('register-confirm-password').value.trim();
        
        if (!username || !email || !password || !confirmPassword) {
            showAlert('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            // CALL REAL BACKEND API
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'success') {
                currentUser = result.user;
                showAlert(result.message, 'success');
                setTimeout(() => {
                    showMainApp();
                    loadUserData();
                }, 1000);
            } else {
                showAlert(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showAlert('Connection error. Make sure the backend is running!', 'error');
        }
    });
}

// Fixed logout function
function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            currentUser = null;
            allEntries = [];
            isEntriesVisible = false;
            entriesContainer.classList.remove('show');
            toggleBtn.textContent = "View Journal Entries";
            showAuthContainer();
        } catch (error) {
            console.error('Logout error:', error);
            // Still logout locally even if backend fails
            currentUser = null;
            showAuthContainer();
        }
    });
}

// Fixed chat function to call real backend
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessageToChat('user', message);
    userInput.value = '';
    
    // Add loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-message loading';
    loadingDiv.textContent = 'MindEase is thinking...';
    chatBox.appendChild(loadingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Call real backend API
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(result => {
        // Remove loading message
        chatBox.removeChild(loadingDiv);
        
        if (result.status === 'success') {
            addMessageToChat('ai', result.reply);
        } else {
            addMessageToChat('ai', 'Sorry, I encountered an error. Please try again.');
        }
    })
    .catch(error => {
        console.error('Chat error:', error);
        chatBox.removeChild(loadingDiv);
        addMessageToChat('ai', 'Connection error. Make sure the backend is running!');
    });
}

        function showAlert(message, type) {
            clearAlerts();
            const alert = document.createElement('div');
            alert.className = `alert ${type}`;
            alert.textContent = message;
            alertContainer.appendChild(alert);
            
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 5000);
        }

        function clearAlerts() {
            alertContainer.innerHTML = '';
        }

        function checkAuthStatus() {
            // For demo purposes, show auth container
            showAuthContainer();
        }

        function showAuthContainer() {
            authContainer.style.display = 'block';
            mainApp.style.display = 'none';
            clearAuthForms();
        }

        function showMainApp() {
            authContainer.style.display = 'none';
            mainApp.style.display = 'block';
            
            if (currentUser) {
                document.getElementById('user-welcome').textContent = `Welcome, ${currentUser.username}!`;
            }
        }

        function clearAuthForms() {
            document.querySelectorAll('.form-input').forEach(input => {
                input.value = '';
            });
        }

        function loadUserData() {
            loadEntries();
            loadModePreference();
        }

        // ================= ORIGINAL APP FUNCTIONALITY =================
        function setupOriginalApp() {
            setupJournalFunctionality();
            setupChatFunctionality();
            setupSoundFunctionality();
            setupModeToggle();
            setupLogout();
        }

        function setupJournalFunctionality() {
            saveButton.addEventListener("click", saveEntry);
            toggleBtn.addEventListener("click", toggleEntries);
            searchInput.addEventListener("input", searchEntries);
            clearSearchBtn.addEventListener("click", clearSearch);
        }

        function setupChatFunctionality() {
            sendBtn.addEventListener('click', sendMessage);
            userInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }

        function setupSoundFunctionality() {
    soundToggle.addEventListener('click', toggleSoundMenu);
    
    document.querySelectorAll('.sound-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const soundType = this.dataset.sound;
            toggleSound(soundType, this);
        });
    });
}

        function setupModeToggle() {
            modeToggle.addEventListener("click", toggleMode);
        }

       

        // Journal Functions
        function saveEntry() {
            const content = textarea.value.trim();
            if (!content) {
                alert("Please write something before saving!");
                return;
            }

            const entry = {
                id: Date.now(),
                content: content,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                mood: "😊 Good" // Default mood
            };

            allEntries.unshift(entry);
            textarea.value = "";
            saveEntries();
            
            if (isEntriesVisible) {
                displayEntries();
            }
            
            alert("Entry saved successfully! 🎉");
        }

        function toggleEntries() {
            isEntriesVisible = !isEntriesVisible;
            
            if (isEntriesVisible) {
                entriesContainer.classList.add("show");
                toggleBtn.textContent = "Hide Journal Entries";
                displayEntries();
            } else {
                entriesContainer.classList.remove("show");
                toggleBtn.textContent = "View Journal Entries";
            }
        }

        function displayEntries() {
            const entriesToShow = currentSearchTerm ? 
                allEntries.filter(entry => 
                    entry.content.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
                    entry.date.includes(currentSearchTerm) ||
                    entry.mood.toLowerCase().includes(currentSearchTerm.toLowerCase())
                ) : allEntries;

            if (entriesToShow.length === 0) {
                entryDisplay.innerHTML = currentSearchTerm ? 
                    '<p>No entries found matching your search.</p>' : 
                    '<p>No journal entries yet. Start writing! ✍️</p>';
                return;
            }

            entryDisplay.innerHTML = entriesToShow.map(entry => `
                <div class="entry" data-id="${entry.id}">
                    <div class="entry-time">${entry.date} at ${entry.time}</div>
                    <div class="entry-mood">${entry.mood}</div>
                    <div class="entry-content">${highlightSearchTerms(entry.content)}</div>
                    <button onclick="editEntry(${entry.id})">Edit</button>
                    <button onclick="deleteEntry(${entry.id})">Delete</button>
                </div>
            `).join('');
        }

        function editEntry(id) {
            const entry = allEntries.find(e => e.id === id);
            if (!entry) return;

            editingEntryId = id;
            const entryElement = document.querySelector(`[data-id="${id}"]`);
            const contentDiv = entryElement.querySelector('.entry-content');
            
            entryElement.classList.add('editing');
            contentDiv.innerHTML = `
                <textarea style="width: 100%; height: 120px; margin: 10px 0; padding: 10px; border: 2px solid var(--primary-color); border-radius: 8px; background: var(--input-bg); color: var(--text-color); font-family: inherit;">${entry.content}</textarea>
                <button onclick="saveEdit(${id})">Save Changes</button>
                <button onclick="cancelEdit(${id})">Cancel</button>
            `;
        }

        function saveEdit(id) {
            const entryElement = document.querySelector(`[data-id="${id}"]`);
            const textarea = entryElement.querySelector('textarea');
            const newContent = textarea.value.trim();
            
            if (!newContent) {
                alert('Entry cannot be empty!');
                return;
            }
            
            const entry = allEntries.find(e => e.id === id);
            entry.content = newContent;
            
            editingEntryId = null;
            saveEntries();
            displayEntries();
            alert('Entry updated successfully! ✅');
        }

        function cancelEdit(id) {
            editingEntryId = null;
            displayEntries();
        }

        function deleteEntry(id) {
            if (confirm("Are you sure you want to delete this entry?")) {
                allEntries = allEntries.filter(entry => entry.id !== id);
                saveEntries();
                displayEntries();
                alert("Entry deleted successfully! 🗑️");
            }
        }

        function searchEntries() {
            currentSearchTerm = searchInput.value.trim();
            displayEntries();
        }

        function clearSearch() {
            searchInput.value = "";
            currentSearchTerm = "";
            displayEntries();
        }

        function highlightSearchTerms(text) {
            if (!currentSearchTerm) return text;
            const regex = new RegExp(`(${escapeRegExp(currentSearchTerm)})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        }

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\                    if (input.type');
        }

  
        

        function addMessageToChat(sender, message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `${sender}-message`;
            messageDiv.textContent = message;
            chatBox.appendChild(messageDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Sound Functions
        function toggleSoundMenu() {
            soundButtons.classList.toggle('show');
        }

        function toggleSound(soundType, button) {
    console.log(`Toggling sound: ${soundType}, currently playing: ${playing[soundType]}`);
    
    if (playing[soundType]) {
        // Stop the sound
        try {
            sounds[soundType].pause();
            sounds[soundType].currentTime = 0;
        } catch (e) {
            console.log('Audio pause failed:', e);
        }
        playing[soundType] = false;
        button.classList.remove('playing');
        console.log(`Stopped ${soundType}`);
    } else {
        // Stop all other sounds first
        Object.keys(playing).forEach(key => {
            if (playing[key]) {
                try {
                    sounds[key].pause();
                    sounds[key].currentTime = 0;
                } catch (e) {
                    console.log('Audio pause failed:', e);
                }
                playing[key] = false;
                document.querySelector(`[data-sound="${key}"]`).classList.remove('playing');
            }
        });
        
        // Start the selected sound
        try {
            sounds[soundType].play().then(() => {
                playing[soundType] = true;
                button.classList.add('playing');
                console.log(`Started ${soundType}`);
            }).catch(e => {
                console.log('Audio play failed:', e);
                // Still update UI for feedback
                playing[soundType] = true;
                button.classList.add('playing');
                console.log(`Visual feedback: Started ${soundType}`);
            });
        } catch (e) {
            console.log('Audio play failed:', e);
            // Still update UI for feedback
            playing[soundType] = true;
            button.classList.add('playing');
            console.log(`Visual feedback: Started ${soundType}`);
        }
    }
}


        // Mode Toggle
        function toggleMode() {
            const isLight = mainApp.classList.contains("light-mode");
            
            if (isLight) {
                mainApp.classList.remove("light-mode");
                mainApp.classList.add("dark-mode");
                modeToggle.textContent = "☀️ Toggle Light Mode";
            } else {
                mainApp.classList.remove("dark-mode");
                mainApp.classList.add("light-mode");
                modeToggle.textContent = "🌙 Toggle Dark Mode";
            }
            
            saveModePreference();
        }

        // Storage Functions (In a real app, these would connect to a database)
        function saveEntries() {
            if (currentUser) {
                localStorage.setItem(`mindease_entries_${currentUser.username}`, JSON.stringify(allEntries));
            }
        }

        function loadEntries() {
            if (currentUser) {
                const saved = localStorage.getItem(`mindease_entries_${currentUser.username}`);
                if (saved) {
                    allEntries = JSON.parse(saved);
                }
            }
        }

        function saveModePreference() {
            if (currentUser) {
                const isDark = mainApp.classList.contains("dark-mode");
                localStorage.setItem(`mindease_mode_${currentUser.username}`, isDark ? 'dark' : 'light');
            }
        }

        function loadModePreference() {
            if (currentUser) {
                const savedMode = localStorage.getItem(`mindease_mode_${currentUser.username}`);
                if (savedMode === 'dark') {
                    mainApp.classList.remove("light-mode");
                    mainApp.classList.add("dark-mode");
                    modeToggle.textContent = "☀️ Toggle Light Mode";
                }
            }
        }

        function loadQuote() {
            const quotes = [
                "You've survived 100% of your worst days. You're doing great. 💚",
                "Progress, not perfection. 🌱",
                "Your mental health is a priority. Your happiness is essential. 🌟",
                "It's okay to not be okay. What matters is that you're here. 🤗",
                "You are stronger than you think. 💪",
                "Every small step counts. Keep going. 👣",
                "You deserve peace, love, and happiness. 🕊️",
                "Healing is not linear, and that's perfectly okay. 🌈",
                "Your feelings are valid. You matter. ❤️",
                "Take it one day at a time. You've got this. 🌅"
            ];
            
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            document.getElementById('quote').textContent = randomQuote;
        }

        // Close sound menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!soundToggle.contains(e.target) && !soundButtons.contains(e.target)) {
                soundButtons.classList.remove('show');
            }
        });

        // Make functions global for onclick handlers
        window.editEntry = editEntry;
        window.saveEdit = saveEdit;
        window.cancelEdit = cancelEdit;
        window.deleteEntry = deleteEntry;