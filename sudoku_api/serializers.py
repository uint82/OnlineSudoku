from rest_framework import serializers
from .models import Game, Player, Move

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'color', 'is_host', 'last_active']

class MoveSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    
    class Meta:
        model = Move
        fields = ['id', 'player', 'row', 'column', 'value', 'timestamp']

class GameSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    moves = MoveSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'initial_board', 'current_board', 'difficulty', 'created_at', 'last_activity', 'players', 'moves']
