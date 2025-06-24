from . import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    settings = db.Column(db.JSON)

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class ShapeRoute(db.Model):
    __tablename__ = 'shape_route'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    original_shape = db.Column(db.JSON, nullable=False)
    snapped_route = db.Column(db.JSON, nullable=False)
    mode = db.Column(db.String(50), default='foot-walking')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)