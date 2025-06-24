from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

from config import Config
from flask_cors import CORS

# Global extensions
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)

    CORS(app, supports_credentials=True)

    app.config["JWT_VERIFY_SUB"] = False

    from .auth.routes import auth_bp
    from .users.routes import user_bp
    from .gps.routes import gps_bp
    from .mapping.routes import mapping_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(gps_bp, url_prefix='/gps')
    app.register_blueprint(mapping_bp, url_prefix='/map')

    with app.app_context():
        db.create_all()

    return app