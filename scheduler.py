import os
import django
import time
from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def run_cleanup():
    print("Running cleanup_inactive_games...")
    call_command('cleanup_inactive_games', '--hours=1')

scheduler = BackgroundScheduler()
scheduler.add_job(run_cleanup, 'interval', minutes=5)
scheduler.start()

print("Scheduler started. Press Ctrl+C to stop.")

try:
    while True:
        time.sleep(60)
except (KeyboardInterrupt, SystemExit):
    scheduler.shutdown()

