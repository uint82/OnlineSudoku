# Multiplayer Sudoku Web Application
![image](https://github.com/user-attachments/assets/4b098674-84a9-4727-8976-6e4b353bbb17)

A real-time collaborative Sudoku web application where up to 10 players can work together to solve puzzles of varying difficulty levels.

## Features

- Real-time Collaboration: Solve Sudoku puzzles together with up to 10 players simultaneously
- Multiple Difficulty Levels: Choose from Easy, Medium, and Hard puzzles
- Real-time Chat: Communicate with other players while solving puzzles
- Player Tracking: See which cells other players are currently working on
- Responsive Design: Play on desktop or mobile devices

## Screenshots

![a](https://github.com/user-attachments/assets/8e7eac63-1b9a-430c-b693-e8f473ee1283)

The main game board with real-time player collaboration  
Real-time chat feature for player communication

## How to Play

1. Create or Join a Game Room  
   - Create a new room and select difficulty level  
   - Or join an existing room using the provided code  

2. Solve the Puzzle Together  
   - Click on a cell to select it  
   - Enter a number from 1–9  
   - Other players will see your selection in real-time  
   - Players' cursors are color-coded for easy identification  

3. Use the Chat Feature  
   - Send messages to coordinate with other players  
   - Share strategies or request help on specific cells  

4. Complete the Puzzle  
   - Work together to fill all cells correctly  
   - The system validates entries in real-time  
   - Celebrate your collective victory when the puzzle is solved  

## Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm 6+
- PostgreSQL

### Backend Setup

1. Clone the repository  
~~~bash
git clone https://github.com/uint82/sudoku-multiplayer.git
cd sudoku-multiplayer
~~~

2. Set up a virtual environment  
~~~bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
~~~

3. Install Python dependencies  
~~~bash
pip install -r requirements.txt
~~~

4. Set up the database  
~~~bash
python manage.py migrate
~~~

5. Create a superuser (optional)  
~~~bash
python manage.py createsuperuser
~~~

6. Run the development server  
~~~bash
python manage.py runserver
~~~

### Frontend Setup

1. Navigate to the frontend directory  
~~~bash
cd frontend
~~~

2. Install Node.js dependencies  
~~~bash
npm install
~~~

3. Run the development server  
~~~bash
npm start
~~~

The application should now be running at:

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  

## Project Structure

~~~text
sudoku-multiplayer/
│
├── .git/
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
├── requirements.txt
├── Dockerfile
│
├── backend/
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── utils/
│       ├── App.css
│       ├── App.js
│       └── App.test.js
│
├── sudoku_api/
│   ├── consumers.py
│   ├── models.py
│   ├── routing.py
│   ├── serializers.py
│   ├── urls.py
│   └── views.py
│
├── static/
├── templates/
└── scheduler.py
~~~

## Environment Variables

Create a `.env` file in the root directory:

~~~env
DEBUG=True
SECRET_KEY=your_secret_key
DATABASE_URL=postgresql://username:password@localhost:5432/sudoku_db
ALLOWED_HOSTS=localhost,127.0.0.1
~~~

## Contributing

Contributions are welcome.

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit your changes (`git commit -m 'Add some amazing feature'`)  
4. Push to the branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request  

### Code Style Guidelines

- Follow PEP 8 guidelines for Python code
- Use ESLint and Prettier for JavaScript and React code
- Write meaningful commit messages
- Add tests for new features

## Acknowledgements

- Django
- React
- Django Channels

---

Made by [uint82]
