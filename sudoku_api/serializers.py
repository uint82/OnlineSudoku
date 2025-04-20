from rest_framework import serializers
from .models import Game, Player, Move
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'color', 'is_host', 'last_active']

class MoveSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    game_id = serializers.UUIDField(write_only=True)  
    player_id = serializers.UUIDField(write_only=True)  
    
    class Meta:
        model = Move
        fields = ['id', 'player', 'row', 'column', 'value', 'is_correct', 'timestamp', 'game_id', 'player_id']
        read_only_fields = ['id', 'player', 'timestamp']

    def create(self, validated_data):
        # extract the game_id and player_id from validated_data
        game_id = validated_data.pop('game_id')
        player_id = validated_data.pop('player_id')
        
        # get the game and player objects
        try:
            game = Game.objects.get(id=game_id)
            player = Player.objects.get(id=player_id, game=game)
        except (Game.DoesNotExist, Player.DoesNotExist):
            raise serializers.ValidationError({'error': 'Game or player not found'})
            
        # check if the move is valid (cell should be empty in initial board)
        row = validated_data.get('row')
        column = validated_data.get('column')
        value = validated_data.get('value')
        
        if game.initial_board[row][column] != 0:
            raise serializers.ValidationError({'error': 'Cannot modify initial cell'})
        
        # check if a previous correct move exists at this position
        existing_correct_move = Move.objects.filter(
            game=game,
            row=row,
            column=column,
            is_correct=True
        ).exists()
        
        if existing_correct_move:
            raise serializers.ValidationError({'error': 'Cannot modify a correctly solved cell'})
            
        # check if the move is correct (matches solution)
        is_correct = (game.solution[row][column] == value)
        validated_data['is_correct'] = is_correct
        
        # create the move
        move = Move.objects.create(
            game=game,
            player=player,
            **validated_data
        )
        
        # update the game board
        current_board = game.current_board
        current_board[row][column] = value
        game.current_board = current_board
        game.save()
        
        # check if the game is complete after this move
        is_game_complete = True
        for r in range(9):
            for c in range(9):
                if game.current_board[r][c] != game.solution[r][c]:
                    is_game_complete = False
                    break
            if not is_game_complete:
                break
        
        # if game is complete, mark it
        if is_game_complete and not game.is_complete:
            from django.utils import timezone
            game.is_complete = True
            game.completed_at = timezone.now()
            game.completed_by = player
            game.save()
            
            # notify connected clients via WebSocket
            channel_layer = get_channel_layer()
            room_group_name = f'game_{game.id}'
            try:
                async_to_sync(channel_layer.group_send)(
                    room_group_name,
                    {
                        'type': 'broadcast_game_complete',
                        'player_id': str(player.id)
                    }
                )
            except Exception as e:
                logger.error(f"WebSocket notification error: {e}", exc_info=True)
        
        return move

class GameSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    moves = MoveSerializer(many=True, read_only=True)
    completed_by = PlayerSerializer(read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'initial_board', 'current_board', 'difficulty', 'created_at', 'last_activity', 'players', 'moves', 'is_complete', 'completed_at', 'completed_by']
