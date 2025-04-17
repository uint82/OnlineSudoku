from rest_framework import serializers
from .models import Game, Player, Move

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
        fields = ['id', 'player', 'row', 'column', 'value', 'timestamp', 'game_id', 'player_id']
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
        if game.initial_board[row][column] != 0:
            raise serializers.ValidationError({'error': 'Cannot modify initial cell'})
            
        # create the move
        move = Move.objects.create(
            game=game,
            player=player,
            **validated_data
        )
        
        # update the game board
        current_board = game.current_board
        current_board[row][column] = validated_data.get('value')
        game.current_board = current_board
        game.save()
        
        return move

class GameSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    moves = MoveSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'initial_board', 'current_board', 'difficulty', 'created_at', 'last_activity', 'players', 'moves']

