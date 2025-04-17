from django.db import models
import uuid
import json

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
    row = models.IntegerField()
    column = models.IntegerField()
    value = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Move by {self.player.name}: ({self.row}, {self.column}) = {self.value}"

