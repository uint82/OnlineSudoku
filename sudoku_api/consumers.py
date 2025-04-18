import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Game, Player, Move

class SudokuConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'

        await self.accept()
        
        # join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
    
    async def disconnect(self, close_code):
        # leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'move':
            # handle a new move
            player_id = data.get('player_id')
            row = data.get('row')
            column = data.get('column')
            value = data.get('value')
            
            # save the move to database
            move_data = await self.save_move(player_id, row, column, value)
            
            # broadcast move to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_move',
                    'move': move_data
                }
            )
        
        elif message_type == 'join':
            # handle a new player joining
            player_id = data.get('player_id')
            player_data = await self.get_player_data(player_id)
            
            #bBroadcast join to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_join',
                    'player': player_data
                }
            )
    
    async def broadcast_move(self, event):
        move = event['move']
        
        await self.send(text_data=json.dumps({
            'type': 'move',
            'move': move
        }))
    
    async def broadcast_join(self, event):
        player = event['player']
        
        await self.send(text_data=json.dumps({
            'type': 'join',
            'player': player
        }))
    
    @database_sync_to_async
    def save_move(self, player_id, row, column, value):
        player = Player.objects.get(id=player_id)
        game = player.game
        
        # update the game board
        current_board = game.current_board
        current_board[row][column] = value
        game.current_board = current_board
        game.save()
        
        # create move
        move = Move.objects.create(
            game=game,
            player=player,
            row=row,
            column=column,
            value=value
        )
        
        # return serialized data
        return {
            'id': str(move.id),
            'player': {
                'id': str(player.id),
                'name': player.name,
                'color': player.color
            },
            'row': row,
            'column': column,
            'value': value,
            'timestamp': move.timestamp.isoformat()
        }
    
    @database_sync_to_async
    def get_player_data(self, player_id):
        player = Player.objects.get(id=player_id)
        return {
            'id': str(player.id),
            'name': player.name,
            'color': player.color,
            'is_host': player.is_host
        }
