# Sudoku Multiplayer Web Application

This project creates a multiplayer Sudoku game with Django backend and React frontend, allowing users to share their games via QR codes and links.

## Project Structure

```
sudoku-app/
├── backend/                # Django project
│   ├── sudoku_project/     # Django main project directory
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── sudoku_api/         # Django app
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── consumers.py    # WebSocket consumers
│   │   ├── models.py
│   │   ├── routing.py      # WebSocket routing
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── utils.py        # Sudoku generation utilities
│   │   └── views.py
│   ├── manage.py
│   └── requirements.txt
└── frontend/               # React app
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Board.js
    │   │   ├── Cell.js
    │   │   ├── GameControls.js
    │   │   ├── Invite.js
    │   │   └── SharedGame.js
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   └── utils/
    │       └── sudokuUtils.js
    ├── package.json
    └── README.md
```
