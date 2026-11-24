from uuid import UUID

import pytest
from django.db import IntegrityError, transaction

from gamification.models import GroupGameConfiguration, Rank

GROUP_ID = UUID("11111111-1111-4111-8111-111111111111")
OTHER_GROUP_ID = UUID("22222222-2222-4222-8222-222222222222")


@pytest.mark.django_db
def test_configuration_has_default_currency_name():
    configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )

    assert configuration.currency_name == "Punkty"
    assert not configuration.currency_icon


@pytest.mark.django_db
def test_one_group_cannot_have_two_configurations():
    GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        GroupGameConfiguration.objects.create(
            group_id=GROUP_ID,
        )


@pytest.mark.django_db
def test_rank_threshold_cannot_repeat_in_same_configuration():
    configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )

    Rank.objects.create(
        configuration=configuration,
        name="Nowicjusz",
        threshold=0,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        Rank.objects.create(
            configuration=configuration,
            name="Start",
            threshold=0,
        )


@pytest.mark.django_db
def test_rank_name_cannot_repeat_in_same_configuration():
    configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )

    Rank.objects.create(
        configuration=configuration,
        name="Nowicjusz",
        threshold=0,
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        Rank.objects.create(
            configuration=configuration,
            name="Nowicjusz",
            threshold=100,
        )


@pytest.mark.django_db
def test_same_threshold_can_exist_in_different_groups():
    first_configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )
    second_configuration = GroupGameConfiguration.objects.create(
        group_id=OTHER_GROUP_ID,
    )

    Rank.objects.create(
        configuration=first_configuration,
        name="Nowicjusz",
        threshold=0,
    )
    Rank.objects.create(
        configuration=second_configuration,
        name="Nowicjusz",
        threshold=0,
    )

    assert Rank.objects.count() == 2


@pytest.mark.django_db
def test_ranks_are_ordered_by_threshold():
    configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )

    Rank.objects.create(
        configuration=configuration,
        name="Rycerz",
        threshold=300,
    )
    Rank.objects.create(
        configuration=configuration,
        name="Nowicjusz",
        threshold=0,
    )
    Rank.objects.create(
        configuration=configuration,
        name="Giermek",
        threshold=100,
    )

    thresholds = list(configuration.ranks.values_list("threshold", flat=True))

    assert thresholds == [0, 100, 300]


@pytest.mark.django_db
def test_configurations_are_independent():
    first_configuration = GroupGameConfiguration.objects.create(
        group_id=GROUP_ID,
    )
    second_configuration = GroupGameConfiguration.objects.create(
        group_id=OTHER_GROUP_ID,
    )

    Rank.objects.create(
        configuration=first_configuration,
        name="Nowicjusz",
        threshold=0,
    )
    Rank.objects.create(
        configuration=second_configuration,
        name="Mistrz",
        threshold=500,
    )

    assert first_configuration.ranks.count() == 1
    assert second_configuration.ranks.count() == 1
