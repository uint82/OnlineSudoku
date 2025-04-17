from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
import qrcode
from io import BytesIO
import base64
from django.http import HttpResponse
from django.conf import settings

from .models import Game, Player, Move
from .serializers import GameSerializer, PlayerSerializer, MoveSerializer
from .utils import generate_sudoku

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
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        game = self.get_object()
        
        # create the share URL
        share_url = f"{settings.FRONTEND_URL}/join/{game.id}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(share_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # convert image to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return Response({
            'qr_code': f"data:image/png;base64,{qr_code_base64}",
            'share_url': share_url
        })

class MoveViewSet(viewsets.ModelViewSet):
    queryset = Move.objects.all()
    serializer_class = MoveSerializer
    
    def create(self, request):
        game_id = request.data.get('game_id')
        player_id = request.data.get('player_id')
        row = request.data.get('row')
        column = request.data.get('column')
        value = request.data.get('value')
        
        # validate inputs
        if None in [game_id, player_id, row, column, value]:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            game = Game.objects.get(id=game_id)
            player = Player.objects.get(id=player_id, game=game)
        except (Game.DoesNotExist, Player.DoesNotExist):
            return Response({'error': 'Game or player not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # validate move (check if initial cell was empty)
        if game.initial_board[row][column] != 0:
            return Response({'error': 'Cannot modify initial cell'}, status=status.HTTP_400_BAD_REQUEST)
        
        # update the game board
        current_board = game.current_board
        current_board[row][column] = value
        game.current_board = current_board
        game.save()
        
        # record the move
        move = Move.objects.create(
            game=game,
            player=player,
            row=row,
            column=column,
            value=value
        )
        
        serializer = MoveSerializer(move)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
