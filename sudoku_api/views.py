from django.shortcuts import get_object_or_404
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from .models import Game, Player, Move
from .serializers import GameSerializer, PlayerSerializer, MoveSerializer
from .utils import generate_sudoku, generate_qr_code

"""
views.py - REST API endpoints for multiplayer Sudoku game

This file contains ViewSets that handle HTTP requests for game management.
Key features:
- GameViewSet: Handles game creation, joining, QR code generation for sharing
- MoveViewSet: Manages move validation and persistence
- WebSocket notifications are sent when players join via REST API

The available() endpoint lets users discover joinable games, while the
join() and create() methods handle player management, including host assignment.
QR code generation enables easy game sharing across devices.
"""


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    
    def create(self, request):
        # get difficulty from request data or default to medium
        difficulty = request.data.get('difficulty', 'medium')
        
        # generate new Sudoku puzzle
        sudoku_data = generate_sudoku(difficulty)
        
        # create a new game
        game = Game.objects.create(
            initial_board=sudoku_data['puzzle'],
            current_board=sudoku_data['puzzle'],
            solution=sudoku_data['solution'],
            difficulty=difficulty
        )
        
        # create the host player
        player_name = request.data.get('player_name', 'Host')
        player_color = request.data.get('player_color', '#3498db')
        
        player = Player.objects.create(
            game=game,
            name=player_name,
            color=player_color,
            is_host=True
        )
        
        # return game data with player info
        serializer = self.get_serializer(game)
        response_data = serializer.data
        response_data['player_id'] = str(player.id)
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        game = self.get_object()
        
        player_name = request.data.get('player_name', 'Guest')
        player_color = request.data.get('player_color', '#e74c3c')
        
        player = Player.objects.create(
            game=game,
            name=player_name,
            color=player_color,
            is_host=False
        )
        
        serializer = GameSerializer(game)
        response_data = serializer.data
        response_data['player_id'] = str(player.id)

        # send the complete player list
        self.notify_player_list_update(game.id)
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        game = self.get_object()
        
        # create the share URL
        share_url = f"{settings.FRONTEND_URL}/join/{game.id}"
        
        # generate QR code using utility function
        qr_code_base64 = generate_qr_code(share_url)
        
        return Response({
            'qr_code': f"data:image/png;base64,{qr_code_base64}",
            'share_url': share_url
        })

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Returns a list of available games that can be joined
        """
        # check if 'is_active' field exists in Game model
        if not hasattr(Game, 'is_active'):
            # if not, just filter based on player count
            available_games = Game.objects.annotate(
                player_count=Count('players')
            ).filter(player_count__lte=10)
        else:
            # if it exists, include it in the filter
            available_games = Game.objects.annotate(
                player_count=Count('players')
            ).filter(player_count__lte=10, is_active=True)
        
        # format the response
        games_data = []
        for game in available_games:
            host = game.players.filter(is_host=True).first()
            host_name = host.name if host else "Unknown"
            
            games_data.append({
                'id': game.id,
                'host_name': host_name,
                'difficulty': game.difficulty,
                'player_count': game.players.count(),
                'created_at': game.created_at
            })
            
        return Response(games_data)

    def notify_player_list_update(self, game_id):
        """Send WebSocket notification with complete player list"""
        try:
            channel_layer = get_channel_layer()
            room_group_name = f'game_{game_id}'
            
            # get all players for this game
            all_players = Player.objects.filter(game_id=game_id)
            players_data = [
                {
                    'id': str(p.id),
                    'name': p.name,
                    'color': p.color,
                    'is_host': p.is_host
                }
                for p in all_players
            ]
            
            # send only one message with the complete player list
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'broadcast_player_list',
                    'players': players_data
                }
            )
            
        except Exception as e:
            # more detailed error logging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"WebSocket notification error: {e}", exc_info=True)


class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.all()
    serializer_class = MoveSerializer
    
    # using serializer level validation and creation method
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
