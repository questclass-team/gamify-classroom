from rest_framework import serializers


class MeResponseSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    role = serializers.CharField()


class TeacherResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
