# Generated by Django 5.2 on 2025-04-23 16:10

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sudoku_api', '0010_alter_player_unique_together'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='player',
            unique_together=set(),
        ),
    ]
