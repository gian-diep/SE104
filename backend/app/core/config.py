from dotenv import load_dotenv
import urllib
import os

load_dotenv()

server = os.getenv("DB_SERVER")
database = os.getenv("DB_NAME")
driver = os.getenv("DB_DRIVER")

params = urllib.parse.quote_plus(
    f"DRIVER={driver};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"Trusted_Connection=yes;"
)

DATABASE_URL = (
    f"mssql+pyodbc:///?odbc_connect={params}"
)