class Config:
    SECRET_KEY = "secretblablablahagsjamkasaaas"
    SQLALCHEMY_DATABASE_URI = "sqlite:///db.sqlite"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = False
