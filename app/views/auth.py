from flask import Blueprint, render_template, request, redirect, url_for, flash, session, make_response
from flask_login import login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import User, db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()
        if user:
            return render_template('register.html', error="Email address already exists.", email=email, username=username)

        user = User.query.filter_by(username=username).first()
        if user:
            return render_template('register.html', error="Username already exists.", email=email, username=username)

        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(email=email, username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Account created successfully!', 'success')
        return redirect(url_for('auth.login'))

    return render_template('register.html')



@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if not user or not check_password_hash(user.password, password):
            return render_template('login.html', error="Invalid email or password.", email=email)

        login_user(user)
        flash('Logged in successfully!', 'success')
        return redirect(url_for('home'))

    return render_template('login.html')


@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    flash('Logged out successfully!', 'success')
    return redirect(url_for('home'))