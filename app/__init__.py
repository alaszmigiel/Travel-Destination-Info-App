import os, glob
from flask import Flask, render_template
from flask_session import Session
from flask_login import LoginManager
from app.config import Config
from app.views.auth import auth_bp
from app.views.location import location_bp
from app.views.weather import weather_bp
from app.views.nearby_places import nearby_places_bp
from app.views.list_management import list_management_bp
from app.database import db

def clear_session_files():
    session_dir = os.path.join(os.getcwd(), 'flask_session')
    if os.path.exists(session_dir):
        for file in glob.glob(f"{session_dir}/*"):
            os.remove(file)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    clear_session_files()
    db.init_app(app)

    Session(app)

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    from .models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(location_bp, url_prefix='/location')
    app.register_blueprint(weather_bp, url_prefix='/weather')
    app.register_blueprint(nearby_places_bp, url_prefix='/nearby')
    app.register_blueprint(list_management_bp, url_prefix='/list_management')

    @app.route('/')
    def home():
        return render_template('index.html')

    with app.app_context():
        db.create_all()

        return app
