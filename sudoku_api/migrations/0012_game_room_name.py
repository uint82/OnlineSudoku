# Generated by Django 5.2 on 2025-04-23 18:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sudoku_api', '0011_alter_player_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='room_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
