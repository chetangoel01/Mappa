import os
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from config import Config
from flask_cors import CORS
from supabase import create_client, Client

# Remove SQLAlchemy
# db = SQLAlchemy()

jwt = JWTManager()
bcrypt = Bcrypt()

supabase: Client = None

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    global supabase
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    supabase = create_client(supabase_url, supabase_key)

    jwt.init_app(app)
    bcrypt.init_app(app)
    CORS(app, supports_credentials=True)
    app.config["JWT_VERIFY_SUB"] = False

    from .auth.routes import auth_bp
    from .users.routes import user_bp
    from .gps.routes import gps_bp
    from .mapping.routes import mapping_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(user_bp, url_prefix='/users')
    app.register_blueprint(gps_bp, url_prefix='/gps')
    app.register_blueprint(mapping_bp, url_prefix='/map')

    return app