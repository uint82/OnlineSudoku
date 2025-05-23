# Generated by Django 5.2 on 2025-04-23 18:42

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sudoku_api', '0012_game_room_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='token',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='player',
            unique_together={('game', 'name')},
        ),
    ]
