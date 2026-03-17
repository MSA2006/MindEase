
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
from datetime import datetime
import traceback
import logging
from google import genai
from dotenv import load_dotenv
import os
import importlib.metadata

logging.basicConfig(level=logging.DEBUG, filename='flask_debug.log', filemode='w')

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if not GEMINI_API_KEY:
    print("[X] WARNING: GEMINI_API_KEY not found in .env file!")
else:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("[OK] Gemini API configured successfully!")

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app, supports_credentials=True)
flask_version = importlib.metadata.version("flask")
werkzeug_version = importlib.metadata.version("werkzeug")


app.secret_key = 'mindease-secret-key-2024'
app.config['SESSION_TYPE'] = 'filesystem'

DATABASE = 'mindease.db'

def init_database():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            mood TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully!")

def hash_password(password):
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${password_hash}"

def verify_password(password, stored_hash):
    try:
        salt, password_hash = stored_hash.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
    except:
        return False

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return {'id': user[0], 'username': user[1], 'email': user[2]}
    return None

def login_required_session(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_current_user():
            return jsonify({'error': 'Login required', 'status': 'error'}), 401
        return f(*args, **kwargs)
    return decorated

def get_chat_context(user_id, limit=3):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT message, response FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    )
    history = cursor.fetchall()
    conn.close()
    context = ""
    for msg, resp in reversed(history):
        context += f"User: {msg}\nMindEase: {resp}\n\n"
    return context

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/health')
def health():
    user = get_current_user()
    return jsonify({
        'status': 'Flask is running!',
        'gemini_configured': bool(client),
        'authenticated': bool(user),
        'user': user['username'] if user else None
    })

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON payload', 'status': 'error'}), 400
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not username or not email or not password:
            return jsonify({'error': 'All fields are required', 'status': 'error'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters', 'status': 'error'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username or email already exists', 'status': 'error'}), 400

        password_hash = hash_password(password)
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        session['user_id'] = user_id
        session['username'] = username

        return jsonify({
            'message': 'Registration successful!',
            'status': 'success',
            'user': {'id': user_id, 'username': username, 'email': email}
        })
    except Exception as e:
        print(f"[ERROR] Registration error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON payload', 'status': 'error'}), 400
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({'error': 'Username and password required', 'status': 'error'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?",
            (username, username)
        )
        user_data = cursor.fetchone()
        conn.close()

        if user_data and verify_password(password, user_data[3]):
            session['user_id'] = user_data[0]
            session['username'] = user_data[1]
            return jsonify({
                'message': 'Login successful!',
                'status': 'success',
                'user': {'id': user_data[0], 'username': user_data[1], 'email': user_data[2]}
            })
        else:
            return jsonify({'error': 'Invalid username or password', 'status': 'error'}), 401
    except Exception as e:
        print(f"[ERROR] Login error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully', 'status': 'success'})

@app.route('/chat', methods=['POST'])
@login_required_session
def chat():
    try:
        current_user = get_current_user()
        if not client:
            return jsonify({'error': 'Gemini API not configured', 'status': 'error'}), 500

        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON payload', 'status': 'error'}), 400
        user_message = data.get('message', '').strip()
        if not user_message:
            return jsonify({'error': 'No message provided', 'status': 'error'}), 400

        chat_context = get_chat_context(current_user['id'], limit=3)

        system_prompt = f"""You are MindEase, a warm and compassionate AI mental health companion chatting with {current_user['username']}.

Your role:
- Be a supportive, empathetic listener who truly cares
- Provide gentle guidance and evidence-based mental health strategies
- Ask thoughtful follow-up questions to understand better
- Offer practical coping techniques when appropriate
- Be encouraging and hopeful while validating feelings
- Keep responses conversational, warm, and human-like (2-4 sentences)
- Use emojis naturally but sparingly

Previous conversation:
{chat_context}

Current message from {current_user['username']}: {user_message}

Respond naturally and supportively:"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=system_prompt
        )
        ai_response = response.text.strip()

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)",
            (current_user['id'], user_message, ai_response)
        )
        conn.commit()
        conn.close()

        return jsonify({'reply': ai_response, 'status': 'success'})
    except Exception as e:
        print(f"[ERROR] Chat error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/journal/save', methods=['POST'])
@login_required_session
def save_journal_entry():
    try:
        current_user = get_current_user()
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid JSON payload', 'status': 'error'}), 400
        content = data.get('content', '').strip()
        mood = data.get('mood', 'Good')
        if not content:
            return jsonify({'error': 'Content cannot be empty', 'status': 'error'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO journal_entries (user_id, content, mood) VALUES (?, ?, ?)",
            (current_user['id'], content, mood)
        )
        entry_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'message': 'Journal entry saved!', 'status': 'success', 'entry_id': entry_id})
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/journal/entries', methods=['GET'])
@login_required_session
def get_journal_entries():
    try:
        current_user = get_current_user()
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, content, mood, created_at FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC",
            (current_user['id'],)
        )
        entries = cursor.fetchall()
        conn.close()

        formatted = []
        for e in entries:
            parts = e[3].split() if e[3] else ['', '']
            formatted.append({
                'id': e[0], 'content': e[1], 'mood': e[2],
                'date': parts[0], 'time': parts[1] if len(parts) > 1 else ''
            })
        return jsonify({'entries': formatted, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/journal/delete/<int:entry_id>', methods=['DELETE'])
@login_required_session
def delete_journal_entry(entry_id):
    try:
        current_user = get_current_user()
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM journal_entries WHERE id = ? AND user_id = ?", (entry_id, current_user['id']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Entry deleted', 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/journal/update/<int:entry_id>', methods=['PUT'])
@login_required_session
def update_journal_entry(entry_id):
    try:
        current_user = get_current_user()
        data = request.get_json()
        content = data.get('content', '').strip()
        if not content:
            return jsonify({'error': 'Content cannot be empty', 'status': 'error'}), 400

        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE journal_entries SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (content, entry_id, current_user['id'])
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'Entry updated', 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.errorhandler(Exception)
def handle_unhandled_exception(e):
    # Ensure any unexpected errors return JSON instead of HTML
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify({'error': str(e), 'status': 'error'}), e.code
    return jsonify({'error': 'Internal server error', 'status': 'error'}), 500


if __name__ == '__main__':
    print("[START] Starting MindEase API with Gemini AI...")
    init_database()
    print("[Frontend] Frontend available at: http://localhost:5000")
    print("[AI] Gemini AI Chat enabled")
    print("[Auth] User authentication enabled")
    app.run(debug=True, host='0.0.0.0', port=5000)