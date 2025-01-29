from app.database import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(250), unique=True, nullable=False)
    username = db.Column(db.String(250), unique=True, nullable=False)
    password = db.Column(db.String(250), nullable=False)
    lists = db.relationship('UserList', backref='user', lazy=True)

class UserList(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    street = db.Column(db.String(250), nullable=True)
    city = db.Column(db.String(250), nullable=False)
    start_date = db.Column(db.String(10), nullable=False)
    end_date = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    categories = db.relationship('Category', backref='list', lazy=True)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(250), nullable=False)
    list_id = db.Column(db.Integer, db.ForeignKey('user_list.id'), nullable=False)
    places = db.relationship('Place', backref='category', lazy=True)

class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)