from rest_framework import serializers

from .models import (
    CURRENCY_NAME_MAX_LENGTH,
    MAX_RANKS,
    POINTS_MAX,
    RANK_NAME_MAX_LENGTH,
    RANK_THRESHOLD_MAX,
    REWARD_REASON_MAX_LENGTH,
    Badge,
    BadgeAward,
    PointReward,
    Rank,
)
from .services import RANKING_BY_POINTS, RANKING_CRITERIA


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


class StrictIntegerField(serializers.IntegerField):
    def to_internal_value(self, data: object) -> int:
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail("invalid")

        return data


class AwardPointsSerializer(serializers.Serializer):
    points = StrictIntegerField(min_value=1, max_value=POINTS_MAX)
    reason = serializers.CharField(
        max_length=REWARD_REASON_MAX_LENGTH,
        allow_blank=True,
        default="",
    )


class StudentProgressSerializer(serializers.Serializer):
    groupId = serializers.UUIDField(source="group_id")
    studentId = serializers.UUIDField(source="student_id")
    balance = serializers.IntegerField()
    rank = RankSerializer(allow_null=True, read_only=True)


class RewardHistoryItemSerializer(serializers.ModelSerializer):
    studentId = serializers.UUIDField(source="progress.student_id", read_only=True)
    awardedBy = serializers.CharField(source="awarded_by", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = PointReward
        fields = (
            "id",
            "points",
            "reason",
            "studentId",
            "awardedBy",
            "createdAt",
        )
        read_only_fields = ("points", "reason")


class CreateBadgeSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=40,
    )
    description = serializers.CharField(
        max_length=200,
        allow_blank=True,
        default="",
    )
    icon = serializers.ChoiceField(choices=Badge.Icon.choices, default=Badge.Icon.MEDAL)


class BadgeSerializer(serializers.ModelSerializer):
    groupId = serializers.UUIDField(
        source="group_id",
        read_only=True,
    )
    createdAt = serializers.DateTimeField(
        source="created_at",
        read_only=True,
    )

    class Meta:
        model = Badge
        fields = (
            "id",
            "groupId",
            "name",
            "description",
            "icon",
            "createdAt",
        )
        read_only_fields = fields


class AwardBadgeSerializer(serializers.Serializer):
    badgeId = StrictIntegerField(min_value=1, max_value=2**63 - 1)


class BadgeAwardSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    badgeId = serializers.IntegerField(
        source="badge_id",
        read_only=True,
    )
    studentId = serializers.UUIDField(
        source="student_id",
        read_only=True,
    )
    awardedBy = serializers.CharField(
        source="awarded_by",
        read_only=True,
    )
    createdAt = serializers.DateTimeField(
        source="created_at",
        read_only=True,
    )

    class Meta:
        model = BadgeAward
        fields = (
            "id",
            "badgeId",
            "badge",
            "studentId",
            "awardedBy",
            "createdAt",
        )
        read_only_fields = fields


class StudentGroupStateSerializer(serializers.Serializer):
    groupId = serializers.UUIDField(source="group_id")
    nickname = serializers.CharField(allow_null=True)
    currencyName = serializers.CharField(source="currency_name")
    currencyIconUrl = serializers.CharField(source="currency_icon_url", allow_null=True)
    balance = serializers.IntegerField()
    rank = RankSerializer(allow_null=True, read_only=True)
    nextRank = RankSerializer(source="next_rank", allow_null=True, read_only=True)
    badges = BadgeAwardSerializer(many=True, read_only=True)
    rewards = RewardHistoryItemSerializer(many=True, read_only=True)


class RankingQuerySerializer(serializers.Serializer):
    by = serializers.ChoiceField(choices=RANKING_CRITERIA, default=RANKING_BY_POINTS)


class RankingEntrySerializer(serializers.Serializer):
    position = serializers.IntegerField()
    nickname = serializers.CharField(allow_null=True)
    balance = serializers.IntegerField()
    rank = RankSerializer(allow_null=True, read_only=True)
    badgeCount = serializers.IntegerField(source="badge_count")
    isMe = serializers.BooleanField(source="is_me")


class GroupRankingSerializer(serializers.Serializer):
    groupId = serializers.UUIDField(source="group_id")
    by = serializers.ChoiceField(choices=RANKING_CRITERIA)
    currencyName = serializers.CharField(source="currency_name")
    currencyIconUrl = serializers.CharField(source="currency_icon_url", allow_null=True)
    entries = RankingEntrySerializer(many=True, read_only=True)
