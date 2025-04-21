from django.contrib import admin

# Register your models here.

from .models import Game, Player, Move

class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    readonly_fields = ('id', 'last_active')

class MoveInline(admin.TabularInline):
    model = Move
    extra = 0
    readonly_fields = ('timestamp',)
    fields = ('player', 'row', 'column', 'value', 'is_correct', 'timestamp')

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('id', 'difficulty', 'is_active', 'is_complete', 'created_at', 'last_activity')
    list_filter = ('difficulty', 'is_active', 'is_complete')
    search_fields = ('id',)
    readonly_fields = ('id', 'created_at', 'last_activity')
    fieldsets = (
        (None, {
            'fields': ('id', 'difficulty', 'is_active', 'is_complete')
        }),
        ('Timing Information', {
            'fields': ('created_at', 'last_activity', 'completed_at', 'completed_by')
        }),
        ('Game Data', {
            'fields': ('initial_board', 'current_board', 'solution'),
            'classes': ('collapse',)
        }),
    )
    inlines = [PlayerInline, MoveInline]
    actions = ['mark_as_inactive']

    def mark_as_inactive(self, request, queryset):
        queryset.update(is_active=False)
    mark_as_inactive.short_description = "Mark selected games as inactive"

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'is_host', 'last_active')
    list_filter = ('is_host',)
    search_fields = ('name', 'game__id')
    readonly_fields = ('id', 'last_active')
    inlines = [MoveInline]

@admin.register(Move)
class MoveAdmin(admin.ModelAdmin):
    list_display = ('player', 'game', 'row', 'column', 'value', 'is_correct', 'timestamp')
    list_filter = ('is_correct',)
    search_fields = ('player__name', 'game__id')
    readonly_fields = ('timestamp',)
