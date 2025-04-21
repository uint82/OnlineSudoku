import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Game, Player, Move
import asyncio
import logging

"""
consumers.py - WebSocket handler for real-time Sudoku gameplay

This file implements the SudokuConsumer for bidirectional communication:
- Connects players to game-specific channels using Django Channels
- Broadcasts moves in real-time to all connected players
- Maintains player lists and synchronizes new connections
- Implements heartbeat mechanism to keep connections alive
- Handles database operations asynchronously to prevent blocking
- Automatically checks for game completion after each move

The consumer coordinates between the REST API and WebSocket connections,
ensuring game state consistency across all connected clients and the database.
Moves are validated, persisted, and immediately broadcast to all players.
Game completion is automatically detected and broadcast to all players.
"""

logger = logging.getLogger(__name__)

class SudokuConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'
        self.heartbeat_task = None
        
        try:
            # join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            
            # start heartbeat task
            self.heartbeat_task = asyncio.create_task(self.send_heartbeat())
            
            # immediately send the current player list to the newly connected client
            all_players = await self.get_all_players()
            await self.send(text_data=json.dumps({
                'type': 'player_list_update',
                'players': all_players
            }))
            
        except asyncio.CancelledError:
            logger.info(f"Connection cancelled for game {self.game_id}")
            await self.close(code=1000)
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}", exc_info=True)
            await self.close(code=4000)   

    async def disconnect(self, close_code):
        # cancel heartbeat task
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            
        # leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def send_heartbeat(self):
        """Send periodic heartbeat to keep connection alive"""
        try:
            while True:
                await asyncio.sleep(30)  # every 30 seconds
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat',
                    'timestamp': self.get_timestamp()
                }))
        except asyncio.CancelledError:
            # task was cancelled, clean up
            pass
        except Exception as e:
            logger.error(f"Heartbeat error: {e}", exc_info=True)
    
    def get_timestamp(self):
        """Return current ISO timestamp for the heartbeat"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'move':
                # handle a new move
                player_id = data.get('player_id')
                row = data.get('row')
                column = data.get('column')
                value = data.get('value')
                
                # validate move data
                if None in (player_id, row, column, value):
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Invalid move data'
                    }))
                    return
                
                try:
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

                    # check if the game is complete after this move
                    if move_data.get('game_complete', False):
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'broadcast_game_complete',
                                'player_id': player_id
                            }
                        )

                except ValueError as ve:
                    # send specific validation error back to client
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': str(ve)
                    }))
                    return
            
            elif message_type == 'join':
                # handle a new player joining
                player_id = data.get('player_id')
                
                if not player_id:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Player ID is required'
                    }))
                    return
                
                # broadcast the player list update (more efficient)
                all_players = await self.get_all_players()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_player_list',
                        'players': all_players
                    }
                )

            elif message_type == 'game_complete':
                # handle explicit game completion request
                player_id = data.get('player_id')
                
                if not player_id:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Player ID is required'
                    }))
                    return
                    
                # validate the game is actually complete before marking it
                is_game_complete = await self.check_game_completion(self.game_id)
                
                if not is_game_complete:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Game is not yet complete'
                    }))
                    return
                
                # mark game as complete in database
                try:
                    await self.mark_game_complete(player_id)
                    
                    # broadcast completion to all players
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'broadcast_game_complete',
                            'player_id': player_id
                        }
                    )
                except ValueError as ve:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': str(ve)
                    }))

            elif message_type == 'request_hint':
                # handle a hint request
                player_id = data.get('player_id')
                row = data.get('row')
                column = data.get('column')
                
                # validate hint data
                if None in (player_id, row, column):
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Invalid hint request data'
                    }))
                    return
                
                try:
                    # process the hint request
                    hint_data = await self.process_hint_request(player_id, row, column)
                    
                    # send the hint only to the requesting client
                    await self.send(text_data=json.dumps({
                        'type': 'hint_response',
                        'value': hint_data['value'],
                        'row': row,
                        'column': column
                    }))
                    
                    # broadcast the move to all clients
                    if hint_data.get('move'):
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'broadcast_move',
                                'move': hint_data['move']
                            }
                        )
                        
                    # check if the game is complete after this hint
                    if hint_data.get('game_complete', False):
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'broadcast_game_complete',
                                'player_id': player_id
                            }
                        )
                        
                except ValueError as ve:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': str(ve)
                    }))
                    return
            
            elif message_type == 'request_player_list':
                # allow clients to request fresh player list
                all_players = await self.get_all_players()
                await self.send(text_data=json.dumps({
                    'type': 'player_list_update',
                    'players': all_players
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON data'
            }))
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))


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
    
    async def broadcast_player_list(self, event):
        players = event['players']
        
        await self.send(text_data=json.dumps({
            'type': 'player_list_update',
            'players': players
        }))

    async def broadcast_game_complete(self, event):
        """Broadcast game completion to all connected clients"""
        player_id = event['player_id']
        
        await self.send(text_data=json.dumps({
            'type': 'game_complete',
            'player_id': player_id
        }))

    @database_sync_to_async
    def check_game_completion(self, game_id):
        """
        Check if the game is complete (all cells filled correctly)
        """
        try:
            game = Game.objects.get(id=game_id)
            
            # if game is already marked complete, return early
            if game.is_complete:
                return True
                
            # check if current board matches solution
            for row in range(9):
                for col in range(9):
                    if game.current_board[row][col] != game.solution[row][col]:
                        return False
            
            return True
        except Game.DoesNotExist:
            logger.error(f"Game {game_id} not found")
            return False
        except Exception as e:
            logger.error(f"Error checking game completion: {e}", exc_info=True)
            return False

    @database_sync_to_async
    def mark_game_complete(self, player_id):
        """Mark the game as complete in the database"""
        from django.utils import timezone
        
        try:
            player = Player.objects.get(id=player_id)
            game = Game.objects.get(id=self.game_id)
            
            # only mark as complete if not already completed
            if not game.is_complete:
                game.is_complete = True
                game.completed_at = timezone.now()
                game.completed_by = player
                game.save()
                
            return True
        except Player.DoesNotExist:
            raise ValueError(f"Player {player_id} not found")
        except Game.DoesNotExist:
            raise ValueError(f"Game {self.game_id} not found")
        except Exception as e:
            logger.error(f"Error marking game as complete: {e}", exc_info=True)
            raise ValueError(f"Error marking game as complete: {str(e)}")

    @database_sync_to_async
    def save_move(self, player_id, row, column, value):
        try:
            player = Player.objects.get(id=player_id)
            game = player.game
            
            # check if cell is part of the initial board
            if game.initial_board[row][column] != 0:
                raise ValueError("Cannot modify initial board cells")
            
            # check if there's already a correct move for this cell
            existing_correct_move = Move.objects.filter(
                game=game,
                row=row,
                column=column,
                is_correct=True
            ).exists()
            
            if existing_correct_move:
                raise ValueError("Cannot modify a correctly solved cell")
            
            # check if the move is correct
            is_correct = (game.solution[row][column] == value)
            
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
                value=value,
                is_correct=is_correct
            )
            
            # check if the game is complete after this move
            is_game_complete = True
            for r in range(9):
                for c in range(9):
                    if game.current_board[r][c] != game.solution[r][c]:
                        is_game_complete = False
                        break
                if not is_game_complete:
                    break
            
            # if game is complete and not already marked, update the game
            if is_game_complete and not game.is_complete:
                from django.utils import timezone
                game.is_complete = True
                game.completed_at = timezone.now()
                game.completed_by = player
                game.save()
            
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
                'is_correct': is_correct,
                'timestamp': move.timestamp.isoformat(),
                'game_complete': is_game_complete
            }
        except Player.DoesNotExist:
            logger.error(f"Player {player_id} not found")
            raise ValueError(f"Player {player_id} not found")
        except ValueError as ve:
            # raise specific validation errors
            logger.error(f"Validation error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"Error saving move: {e}", exc_info=True)
            raise

    @database_sync_to_async
    def process_hint_request(self, player_id, row, column):
        try:
            player = Player.objects.get(id=player_id)
            game = player.game
            
            # check if cell is part of the initial board
            if game.initial_board[row][column] != 0:
                raise ValueError("Cannot get hint for initial board cells")
            
            # check if the cell already has the correct value
            if game.current_board[row][column] == game.solution[row][column]:
                raise ValueError("Cell already has the correct value")
                
            # get the correct value from the solution
            correct_value = game.solution[row][column]
            
            # create a move record for this hint
            move = Move.objects.create(
                game=game,
                player=player,
                row=row,
                column=column,
                value=correct_value,
                is_correct=True
            )
            
            # update the game board
            current_board = game.current_board
            current_board[row][column] = correct_value
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
                
            # return the hint data and move info
            return {
                'value': correct_value,
                'move': {
                    'id': str(move.id),
                    'player': {
                        'id': str(player.id),
                        'name': player.name,
                        'color': player.color
                    },
                    'row': row,
                    'column': column,
                    'value': correct_value,
                    'is_correct': True,
                    'timestamp': move.timestamp.isoformat(),
                    'game_complete': is_game_complete,
                    'is_hint': True  # Flag to identify hint moves
                },
                'game_complete': is_game_complete
            }
        except Player.DoesNotExist:
            raise ValueError(f"Player {player_id} not found")
        except ValueError as ve:
            # re-raise specific validation errors
            raise
        except Exception as e:
            logger.error(f"Error processing hint: {e}", exc_info=True)
            raise ValueError(f"Error processing hint: {str(e)}")
    
    @database_sync_to_async
    def get_player_data(self, player_id):
        try:
            player = Player.objects.get(id=player_id)
            return {
                'id': str(player.id),
                'name': player.name,
                'color': player.color,
                'is_host': player.is_host
            }
        except Player.DoesNotExist:
            logger.error(f"Player {player_id} not found")
            return None
    
    @database_sync_to_async
    def get_all_players(self):
        try:
            # use select_related to optimize the query and get the most recent data
            game = Game.objects.get(id=self.game_id)
            players = Player.objects.filter(game=game).order_by('id')
            
            # no longer manually closing connection as it's managed by Django
            
            return [
                {
                    'id': str(player.id),
                    'name': player.name,
                    'color': player.color,
                    'is_host': player.is_host
                }
                for player in players
            ]
        except Game.DoesNotExist:
            logger.error(f"Game {self.game_id} not found")
            return []
        except Exception as e:
            logger.error(f"Error getting players: {e}", exc_info=True)
            return []
