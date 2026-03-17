# Mind Ease

Mind Ease is a compassionate AI-powered mental health companion web application designed to provide supportive conversations, journaling capabilities, and relaxation tools to help users manage their mental well-being.

## Features

- **AI Chatbot**: Engage in empathetic conversations with MindEase, an AI mental health companion powered by Google Gemini API
- **User Authentication**: Secure registration and login system
- **Journal Entries**: Save and manage personal journal entries with mood tracking
- **Relaxation Sounds**: Built-in sound buttons for rain, waves, birds, and wind to aid relaxation
- **Responsive Design**: Clean, modern interface with dark mode support

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite
- **AI**: Google Gemini API
- **Authentication**: Flask-Session

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mind-ease
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Google Gemini API key: `GEMINI_API_KEY=your_api_key_here`

4. Run the application:
   ```bash
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Usage

1. Register a new account or login with existing credentials
2. Use the chatbot to have supportive conversations
3. Write and save journal entries to track your thoughts and moods
4. Use the sound buttons for relaxation and mindfulness

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).