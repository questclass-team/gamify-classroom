from rest_framework import serializers

from .models import (
    CURRENCY_NAME_MAX_LENGTH,
    MAX_RANKS,
    RANK_NAME_MAX_LENGTH,
    RANK_THRESHOLD_MAX,
    Rank,
)


class RankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rank
        fields = ("name", "threshold")


class UpdateRankSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=RANK_NAME_MAX_LENGTH,
        trim_whitespace=True,
    )
    threshold = serializers.IntegerField(
        min_value=0,
        max_value=RANK_THRESHOLD_MAX,
    )


class UpdateGameConfigSerializer(serializers.Serializer):
    currencyName = serializers.CharField(
        source="currency_name",
        max_length=CURRENCY_NAME_MAX_LENGTH,
        trim_whitespace=True,
    )
    ranks = UpdateRankSerializer(many=True)

    def validate_currencyName(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Currency name is required.")
        return value

    def validate_ranks(self, ranks: list[dict[str, object]]) -> list[dict[str, object]]:
        if len(ranks) > MAX_RANKS:
            raise serializers.ValidationError(
                f"A group can have at most {MAX_RANKS} ranks.",
            )

        names: set[str] = set()
        thresholds: set[int] = set()
        for rank in ranks:
            name = str(rank["name"]).casefold()
            threshold = int(rank["threshold"])
            if name in names:
                raise serializers.ValidationError("Rank names must be unique.")
            if threshold in thresholds:
                raise serializers.ValidationError("Rank thresholds must be unique.")
            names.add(name)
            thresholds.add(threshold)
        return ranks


class CurrencyIconResponseSerializer(serializers.Serializer):
    currencyIconUrl = serializers.CharField()


class GroupGameConfigSerializer(serializers.Serializer):
    currencyName = serializers.CharField(source="currency_name")
    currencyIconUrl = serializers.SerializerMethodField(
        method_name="get_currency_icon_url",
    )
    ranks = RankSerializer(many=True, read_only=True)

    def get_currency_icon_url(self, instance) -> str | None:
        if not instance.currency_icon:
            return None
        return instance.currency_icon.url
