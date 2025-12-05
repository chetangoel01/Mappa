# Mappa

A mobile app for creating and saving walking/running routes with snap-to-roads functionality.

## Tech Stack

### Backend (`mappa-backend/`)
- **Flask** - Python web framework
- **Flask-JWT-Extended** - JWT authentication
- **Supabase** - Database (PostgreSQL)
- **OpenRouteService** - Route snapping API

### Frontend (`my-app/`)
- **React Native** with Expo
- **TypeScript**
- **Zustand** - State management
- **React Native Maps** - Map rendering
- **NativeWind** - Tailwind CSS for React Native

## Getting Started

### Backend Setup

```bash
cd mappa-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
export ORS_API_KEY=your_openrouteservice_key
export JWT_SECRET_KEY=your_secret_key

# Run the server
flask run
```

Or with Docker:
```bash
cd mappa-backend

# Copy .env.example and fill in your credentials
cp .env.example .env

docker-compose up
```

### Frontend Setup

```bash
cd my-app

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

## Project Structure

```
Mappa/
├── mappa-backend/
│   ├── app/
│   │   ├── auth/          # Authentication routes
│   │   ├── gps/           # GPS/location routes
│   │   ├── mapping/       # Route mapping & snapping
│   │   └── users/         # User profile management
│   ├── config.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── my-app/
    ├── src/
    │   ├── components/    # Reusable UI components
    │   ├── screens/       # App screens
    │   ├── services/      # API & utility services
    │   ├── store/         # Zustand state stores
    │   └── theme/         # Theme configuration
    ├── App.tsx
    └── package.json
```

## Features

- 🗺️ Draw routes on an interactive map
- 🛤️ Snap drawn routes to actual roads/paths
- 💾 Save and manage your routes
- 📍 GPS location tracking
- 🌓 Dark/Light theme support
- 📤 Export routes to Google Maps or Apple Maps
- ⏱️ Auto-save functionality

## TODO

- [ ] Add unit tests for backend API endpoints
- [ ] Add integration tests for frontend
- [ ] Implement route sharing between users
- [ ] Add offline map support
- [ ] Implement route statistics (elevation, pace, etc.)
- [ ] Add social features (follow users, like routes)
