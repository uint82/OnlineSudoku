import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from sudoku_api.models import Game, Move

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cleans up inactive game rooms after a specified period of inactivity'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=5,
            help='Number of minutes of inactivity before a game is considered abandoned'
        )
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Number of hours of inactivity before a game is considered abandoned'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        inactivity_hours = options['hours']

        dry_run = options['dry_run']
        inactivity_minutes = options['minutes']
        
        # calculate the cutoff time
        cutoff_time = timezone.now() - timedelta(hours=inactivity_hours)
        cutoff_time = timezone.now() - timedelta(minutes=inactivity_minutes)
        
        # Find games with no activity since the cutoff time
        # A game is considered inactive if:
        # 1. It's not complete, AND
        # 2. No moves have been made since the cutoff time
        inactive_games = []
        for game in Game.objects.filter(is_complete=False):
            last_move = Move.objects.filter(game=game).order_by('-timestamp').first()
            
            if not last_move or last_move.timestamp < cutoff_time:
                inactive_games.append(game)
        
        if dry_run:
            self.stdout.write(f"Would delete {len(inactive_games)} inactive games")
            for game in inactive_games:
                self.stdout.write(f"  - Game ID: {game.id}, Created: {game.created_at}")
        else:
            for game in inactive_games:
                game_id = game.id
                player_count = game.players.count()
                
                # delete the game (this will cascade delete related players and moves)
                game.delete()
                
                logger.info(f"Deleted inactive game {game_id} with {player_count} players. Last activity before {cutoff_time}")
            
            self.stdout.write(
                self.style.SUCCESS(f"Successfully deleted {len(inactive_games)} inactive games")
            )
