import os
import sys
import django
from django.db import connection

# Ensure project root is on sys.path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mfi.settings')
django.setup()

print(sorted(connection.introspection.table_names()))
