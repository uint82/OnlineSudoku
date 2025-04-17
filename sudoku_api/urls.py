from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'games', views.GameViewSet)
router.register(r'moves', views.MoveViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
