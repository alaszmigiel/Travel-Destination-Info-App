# Travel Destination Info App

**Travel Destination Info App** is a web application that allows users to search for travel destinations, check the weather forecast, and explore nearby places such as hotels, restaurants, and attractions. The app provides essential travel information by integrating external APIs.

### Key Features:
- **Search for destinations** – Enter an address to get relevant travel details.
- **Weather forecast** – View the weather conditions for your selected destination on a specific date.
- **Nearby places** – Find hotels, restaurants, and attractions near the selected location.
- **Save Locations** – Users can create and manage lists of saved locations.
- **User authentication** – Users can register, log in, and manage their accounts.


### Project Structure
```
TravelDestinationInfoApp/
│── app/                      # Main application directory
│   ├── static/               
│   │   ├── css/              # Stylesheets
│   │   │   └── styles.css
│   │   ├── icons/            # Weather-related icons
│   │   ├── images/           # Background images
│   │   ├── js/               
│   │   │   └── app.js        # JavaScript logic for frontend
│   ├── templates/            # HTML templates for frontend
│   │   ├── index.html        # Homepage
│   │   ├── login.html        # Login page
│   │   ├── register.html     # Registration page
│   ├── views/                # Flask route handlers
│   │   ├── auth.py           # User authentication (register, login, logout)
│   │   ├── list_management.py # Manages user's saved locations
│   │   ├── location.py       # Handles destination search
│   │   ├── nearby_places.py  # Fetches nearby places (hotels, restaurants, etc.)
│   │   ├── weather.py        # Fetches weather forecast
│   ├── __init__.py           # Initializes the Flask app and registers blueprints
│   ├── config.py             # Database and session configuration
│   ├── database.py           # Database initialization and connection
│   ├── models.py             # Database models (User, UserList, Category, Place)
│── .gitignore                # Files and directories to ignore in version control
│── README.md                 # Project documentation (This file)
│── requirements.txt          # Python dependencies
│── run.py                    # Entry point to start the Flask application
```

## Installation & Usage

### 1. Clone the repository:
```sh
git clone https://github.com/alaszmigiel/Travel-Destination-Info-App.git
cd Travel-Destination-Info-App
```
### 2. Create a virtual environment and install dependencies:
```sh
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
### 3. Set up environment:
Before running the application, create a .flaskenv file in the root directory with the following content:
```sh
FLASK_APP=run.py
FLASK_ENV=development
```

### 4. Set up the database:
``` sh
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```
### 5. Run the Flask application:
``` sh
flask run
```
### 6. Open in your browser:
Visit http://127.0.0.1:5000 in your browser to use the application.

## APIs & Technologies Used
- Flask 
- Flask-SQLAlchemy 
- Flask-Migrate 
- SQLite
- Flask-Login
- Flask Blueprints 
- Werkzeug Security (Used for hashing and verifying passwords)
- Open-Meteo API (Provides weather forecast data)
- Geopy (Nominatim) (Used for location search and geocoding)
- Leaflet.js – (Interactive map)

## Database Info
The application uses Flask-SQLAlchemy to manage the database.

By default, it runs on SQLite, and the database file is stored in instance/db.sqlite.

### Database structure:
- User – Stores user details (email, username, and password).
- UserList – Represents a list of places saved by a user, including the city, street, and date range for a trip.
- Category – Groups saved places into categories.
- Place – Stores specific places that user added to their list.
