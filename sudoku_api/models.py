from django.db import models
import uuid
from django.core.validators import MinValueValidator, MaxValueValidator

"""
models.py - Data models for multiplayer Sudoku

This file defines the database schema for the collaborative Sudoku game:
- Game: Stores puzzle state (initial board, current board, solution)
  with difficulty settings and activity tracking
- Player: Represents users with unique colors for move identification
  and host designation for game management
- Move: Records every cell update with player attribution and timestamps

The UUIDs for games enable secure, shareable game links, while the
JSON fields store the Sudoku grid state efficiently.
"""


class Game(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    initial_board = models.JSONField()
    current_board = models.JSONField()
    solution = models.JSONField()
    difficulty = models.CharField(max_length=10, choices=[
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ], default='medium')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Game {self.id} - {self.difficulty}"

class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=100, default="Anonymous")
    color = models.CharField(max_length=7, default="#3498db")  # Hex color
    is_host = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} in Game {self.game.id}"

class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='moves')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='moves')
    row = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(8)])
    column = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(8)])
    value = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(9)])
    is_correct = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
        
    class Meta:
        # additional constraint to ensure we get proper row/column validation
        constraints = [
            models.CheckConstraint(
                check=models.Q(row__gte=0, row__lte=8),
                name='row_within_bounds'
            ),
            models.CheckConstraint(
                check=models.Q(column__gte=0, column__lte=8),
                name='column_within_bounds'
            ),
            models.CheckConstraint(
                check=models.Q(value__gte=0, value__lte=9),
                name='value_within_bounds'
            ),
        ]
    
    def __str__(self):
        return f"Move by {self.player.name}: ({self.row}, {self.column}) = {self.value}"
